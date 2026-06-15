import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  const settings = db.prepare("SELECT key, value FROM fb_settings").all() as Array<{ key: string; value: string }>;
  const config: Record<string, string> = {};
  for (const row of settings) config[row.key] = row.value;

  if (mode === "subscribe" && token === config.verify_token) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.object === "page") {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === "comments" && change.value?.message) {
            const commentText = change.value.message;
            const customerName = change.value.from?.name || "Facebook User";

            const matchMode = db.prepare("SELECT value FROM fb_settings WHERE key = 'match_mode'").get("match_mode") as { value: string } | undefined;
            const mode = matchMode?.value || "contains";

            const keywords = db.prepare(`
              SELECT f.id, f.keyword, f.product_id, f.quantity, p.name as product_name, p.quantity as stock
              FROM fb_keywords f
              JOIN products p ON p.id = f.product_id
              ORDER BY LENGTH(f.keyword) DESC
            `).all() as Array<{ id: number; keyword: string; product_id: number; quantity: number; product_name: string; stock: number }>;

            const lower = commentText.toLowerCase();
            const matched = keywords.find((k) => {
              if (mode === "exact") return lower === k.keyword;
              if (mode === "starts") return lower.startsWith(k.keyword);
              return lower.includes(k.keyword);
            });

            if (matched) {
              const orderQty = matched.quantity;
              const insufficient = matched.stock < orderQty;

              db.prepare(
                "INSERT INTO fb_orders (customer_name, comment_text, keyword, product_id, quantity, status) VALUES (?, ?, ?, ?, ?, ?)"
              ).run(customerName, commentText, matched.keyword, matched.product_id, orderQty, insufficient ? "cancelled" : "pending");

              if (!insufficient) {
                db.transaction(() => {
                  db.prepare("INSERT INTO stock_movements (product_id, type, quantity, note) VALUES (?, 'OUT', ?, ?)").run(
                    matched.product_id, orderQty, `FB Live: ${matched.keyword}`
                  );
                  db.prepare("UPDATE products SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ?").run(
                    orderQty, matched.product_id
                  );
                })();
              }
            } else {
              db.prepare("INSERT INTO fb_orders (customer_name, comment_text, status) VALUES (?, ?, 'cancelled')").run(
                customerName, commentText
              );
            }
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
