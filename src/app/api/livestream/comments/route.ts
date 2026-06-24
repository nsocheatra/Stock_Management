import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiAuth } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const { error } = await requireApiAuth();
  if (error) return error;

  const body = await req.json();
  const { livestream_id, facebook_comment_id, customer_name, customer_avatar, customer_id, message } = body;
  if (!livestream_id || !facebook_comment_id || !customer_name || !customer_id || !message) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check duplicate within 30 seconds
  const recent = await db.prepare(`
    SELECT id FROM live_comments 
    WHERE customer_id = ? AND livestream_id = ? AND message = ? 
    AND created_at > datetime('now', '-30 seconds')
  `).get(customer_id, livestream_id, message);
  if (recent) return NextResponse.json({ error: "Duplicate comment" }, { status: 409 });

  // Keyword detection
  const keywords = await db.prepare("SELECT lp.*, p.name as product_name FROM live_products lp JOIN products p ON lp.product_id = p.id WHERE lp.livestream_id = ? ORDER BY lp.priority DESC").all(livestream_id) as any[];
  let detectedKeyword: string | null = null;
  let detectedQty = 1;
  let matchedProductId: number | null = null;
  let matchedProductName: string | null = null;
  let status = "pending";

  const lower = message.toLowerCase();
  for (const k of keywords) {
    const kw = k.keyword.toLowerCase();
    const idx = lower.indexOf(kw);
    if (idx !== -1) {
      detectedKeyword = k.keyword;
      matchedProductId = k.product_id;
      matchedProductName = k.product_name;
      // Extract quantity after keyword
      const after = message.slice(idx + kw.length).trim();
      const qtyMatch = after.match(/^(\d+)/);
      detectedQty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
      if (k.max_quantity && detectedQty > k.max_quantity) detectedQty = k.max_quantity;
      status = "matched";
      break;
    }
  }

  const result = await db.prepare(`
    INSERT INTO live_comments (livestream_id, facebook_comment_id, customer_name, customer_avatar, customer_id, message, detected_keyword, detected_quantity, matched_product_id, matched_product_name, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(livestream_id, facebook_comment_id, customer_name, customer_avatar || null, customer_id, message, detectedKeyword, detectedQty, matchedProductId, matchedProductName, status);

  if (status === "matched") {
    await db.prepare("UPDATE livestreams SET comment_count = comment_count + 1 WHERE id = ?").run(livestream_id);
  }

  return NextResponse.json({ id: result.lastInsertRowid, status, detectedKeyword, detectedQty, matchedProductName });
}
