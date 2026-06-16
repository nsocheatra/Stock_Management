import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = body.message?.text?.trim();

    if (!message) return NextResponse.json({ ok: true });

    const chatId = body.message.chat.id;
    const firstName = body.message.from?.first_name || "User";
    const cmd = message.toLowerCase();

    let reply = "";

    if (cmd === "/start") {
      reply = `Hello ${firstName}! I'm your Stock Manager bot.\n\nCommands:\n/stock <name> - Check stock by product name\n/lowstock - List products with low stock\n/summary - Daily sales summary\n/help - Show this message`;
    } else if (cmd === "/help") {
      reply = `Commands:\n/stock <name> - Check stock by product name\n/lowstock - List products with low stock\n/summary - Show daily summary\n/help - Show this message`;
    } else if (cmd === "/lowstock") {
      const items = await db.prepare("SELECT name, sku, quantity, min_stock FROM products WHERE quantity <= min_stock ORDER BY quantity ASC LIMIT 10").all() as Array<{ name: string; sku: string; quantity: number; min_stock: number }>;
      if (items.length === 0) {
        reply = "All products have sufficient stock.";
      } else {
        reply = "Low Stock Products:\n\n" + items.map((p) => `• ${p.name} (${p.sku}): ${p.quantity} / min ${p.min_stock}`).join("\n");
      }
    } else if (cmd === "/summary") {
      const stats = await db.prepare("SELECT COUNT(*) as total, COALESCE(SUM(quantity), 0) as total_qty FROM stock_movements WHERE type='OUT' AND date(created_at) = date('now')").get() as { total: number; total_qty: number };
      const revenue = await db.prepare("SELECT COALESCE(SUM(sm.quantity * p.price), 0) as total FROM stock_movements sm JOIN products p ON p.id = sm.product_id WHERE sm.type='OUT' AND date(sm.created_at) = date('now')").get() as { total: number };
      const totalProducts = (await db.prepare("SELECT COUNT(*) as count FROM products WHERE quantity > 0").get() as { count: number }).count;
      reply = `Daily Summary\n\nSold items: ${stats.total_qty}\nTransactions: ${stats.total}\nRevenue: $${revenue.total.toFixed(2)}\nActive products: ${totalProducts}`;
    } else if (cmd.startsWith("/stock ")) {
      const search = cmd.replace("/stock ", "").trim();
      const products = await db.prepare("SELECT name, sku, price, quantity FROM products WHERE LOWER(name) LIKE ? LIMIT 5").all(`%${search}%`) as Array<{ name: string; sku: string; price: number; quantity: number }>;
      if (products.length === 0) {
        reply = `No products found matching "${search}".`;
      } else {
        reply = "Products found:\n\n" + products.map((p) => `• ${p.name} (${p.sku}): $${p.price} — ${p.quantity} in stock`).join("\n");
      }
    } else {
      reply = "Unknown command. Type /help for available commands.";
    }

    const token = (await db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get() as { value: string } | undefined)?.value;
    if (token) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: reply, parse_mode: "HTML" }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
