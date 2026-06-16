import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  const verifyToken = (await db.prepare("SELECT value FROM settings WHERE key = 'messenger_verify_token'").get() as { value: string } | undefined)?.value;

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.object === "page") {
      for (const entry of body.entry || []) {
        for (const event of entry.messaging || []) {
          const senderId = event.sender?.id;
          if (!senderId) continue;

          const messageText = event.message?.text?.trim();
          const postback = event.postback?.payload;

          if (postback) {
            await handlePostback(senderId, postback);
            continue;
          }

          if (messageText) {
            await handleMessage(senderId, messageText);
          }
        }
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Not a page subscription" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

async function handleMessage(senderId: string, text: string) {
  const lower = text.toLowerCase().trim();
  const greeting = (await db.prepare("SELECT value FROM settings WHERE key = 'messenger_greeting'").get() as { value: string } | undefined)?.value || "Welcome!";
  const notFound = (await db.prepare("SELECT value FROM settings WHERE key = 'messenger_not_found'").get() as { value: string } | undefined)?.value || "Not found.";
  const token = (await db.prepare("SELECT value FROM settings WHERE key = 'messenger_page_token'").get() as { value: string } | undefined)?.value;

  if (!token) return;

  if (lower === "menu" || lower === "start" || lower === "help") {
    await sendMessage(token, senderId, {
      text: greeting + "\n\nType a product name to search.\nOr type: menu, products, categories",
      quick_replies: [
        { content_type: "text", title: "Products", payload: "LIST_PRODUCTS" },
        { content_type: "text", title: "Low Stock", payload: "LOW_STOCK" },
      ],
    });
    return;
  }

  if (lower === "products" || lower === "list") {
    const products = await db.prepare("SELECT name, sku, price, quantity FROM products ORDER BY name ASC LIMIT 10").all() as Array<{ name: string; sku: string; price: number; quantity: number }>;
    if (products.length === 0) {
      await sendMessage(token, senderId, { text: "No products available." });
    } else {
      const lines = products.map((p) => `• ${p.name} (${p.sku}): $${p.price} (${p.quantity} in stock)`);
      await sendMessage(token, senderId, { text: "Products:\n\n" + lines.join("\n") });
    }
    return;
  }

  if (lower === "low stock" || lower === "lowstock") {
    const items = await db.prepare("SELECT name, sku, quantity, min_stock FROM products WHERE quantity <= min_stock ORDER BY quantity ASC LIMIT 10").all() as Array<{ name: string; sku: string; quantity: number; min_stock: number }>;
    if (items.length === 0) {
      await sendMessage(token, senderId, { text: "All products have sufficient stock." });
    } else {
      await sendMessage(token, senderId, { text: "Low Stock:\n\n" + items.map((p) => `• ${p.name} (${p.sku}): ${p.quantity} / min ${p.min_stock}`).join("\n") });
    }
    return;
  }

  const products = await db.prepare("SELECT name, sku, price, quantity FROM products WHERE LOWER(name) LIKE ? LIMIT 5").all(`%${lower}%`) as Array<{ name: string; sku: string; price: number; quantity: number }>;
  if (products.length > 0) {
    const lines = products.map((p) => `• ${p.name} (${p.sku}): $${p.price} — ${p.quantity} in stock`);
    await sendMessage(token, senderId, { text: "Search results:\n\n" + lines.join("\n") });
  } else {
    await sendMessage(token, senderId, { text: notFound });
  }
}

async function handlePostback(senderId: string, payload: string) {
  const token = (await db.prepare("SELECT value FROM settings WHERE key = 'messenger_page_token'").get() as { value: string } | undefined)?.value;
  if (!token) return;

  if (payload === "LIST_PRODUCTS") {
    const products = await db.prepare("SELECT name, sku, price, quantity FROM products ORDER BY name ASC LIMIT 10").all() as Array<{ name: string; sku: string; price: number; quantity: number }>;
    const lines = products.map((p) => `• ${p.name} (${p.sku}): $${p.price} (${p.quantity} in stock)`);
    await sendMessage(token, senderId, { text: "Products:\n\n" + lines.join("\n") });
  } else if (payload === "LOW_STOCK") {
    const items = await db.prepare("SELECT name, sku, quantity, min_stock FROM products WHERE quantity <= min_stock ORDER BY quantity ASC LIMIT 10").all() as Array<{ name: string; sku: string; quantity: number; min_stock: number }>;
    if (items.length === 0) {
      await sendMessage(token, senderId, { text: "All products have sufficient stock." });
    } else {
      await sendMessage(token, senderId, { text: "Low Stock:\n\n" + items.map((p) => `• ${p.name} (${p.sku}): ${p.quantity} / min ${p.min_stock}`).join("\n") });
    }
  }
}

async function sendMessage(token: string, recipientId: string, msg: { text: string; quick_replies?: Array<{ content_type: string; title: string; payload: string }> }) {
  try {
    await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: recipientId }, message: msg }),
    });
  } catch { /* silent */ }
}
