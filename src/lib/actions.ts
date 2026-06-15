"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";

export async function createProduct(formData: FormData) {
  const stmt = db.prepare(`
    INSERT INTO products (name, sku, price, cost_price, selling_price, original_price, unit_price, price_per_case, quantity, description, category, min_stock, supplier_id, barcode, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    formData.get("name"),
    formData.get("sku"),
    parseFloat(formData.get("price") as string),
    formData.get("cost_price") ? parseFloat(formData.get("cost_price") as string) : null,
    formData.get("selling_price") ? parseFloat(formData.get("selling_price") as string) : null,
    formData.get("original_price") ? parseFloat(formData.get("original_price") as string) : null,
    formData.get("unit_price") ? parseFloat(formData.get("unit_price") as string) : null,
    formData.get("price_per_case") ? parseFloat(formData.get("price_per_case") as string) : null,
    parseInt(formData.get("quantity") as string) || 0,
    formData.get("description"),
    formData.get("category"),
    parseInt(formData.get("minStock") as string) || 5,
    formData.get("supplierId") ? parseInt(formData.get("supplierId") as string) : null,
    formData.get("barcode") || null,
    formData.get("image_url") || null,
  );
  revalidatePath("/products");
  redirect("/products");
}

export async function updateProduct(id: number, formData: FormData) {
  const stmt = db.prepare(`
    UPDATE products SET name=?, sku=?, price=?, cost_price=?, selling_price=?, original_price=?, unit_price=?, price_per_case=?, quantity=?, description=?, category=?, min_stock=?, supplier_id=?, barcode=?, image_url=?, updated_at=datetime('now')
    WHERE id=?
  `);
  stmt.run(
    formData.get("name"),
    formData.get("sku"),
    parseFloat(formData.get("price") as string),
    formData.get("cost_price") ? parseFloat(formData.get("cost_price") as string) : null,
    formData.get("selling_price") ? parseFloat(formData.get("selling_price") as string) : null,
    formData.get("original_price") ? parseFloat(formData.get("original_price") as string) : null,
    formData.get("unit_price") ? parseFloat(formData.get("unit_price") as string) : null,
    formData.get("price_per_case") ? parseFloat(formData.get("price_per_case") as string) : null,
    parseInt(formData.get("quantity") as string) || 0,
    formData.get("description"),
    formData.get("category"),
    parseInt(formData.get("minStock") as string) || 5,
    formData.get("supplierId") ? parseInt(formData.get("supplierId") as string) : null,
    formData.get("barcode") || null,
    formData.get("image_url") || null,
    id,
  );
  revalidatePath("/products");
  redirect("/products");
}

export async function deleteProduct(id: number) {
  db.prepare("DELETE FROM stock_movements WHERE product_id = ?").run(id);
  db.prepare("DELETE FROM products WHERE id = ?").run(id);
  revalidatePath("/products");
  redirect("/products");
}

export async function createStockMovement(formData: FormData) {
  const productId = parseInt(formData.get("productId") as string);
  const type = formData.get("type") as string;
  const quantity = parseInt(formData.get("quantity") as string);
  const note = formData.get("note") as string;
  const date = formData.get("date") as string;
  const unitCost = type === "IN" ? parseFloat(formData.get("unit_cost") as string) || null : null;
  const caseCost = type === "IN" ? parseFloat(formData.get("case_cost") as string) || null : null;
  const caseQuantity = type === "IN" ? parseInt(formData.get("case_quantity") as string) || null : null;

  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(productId) as { quantity: number } | undefined;
  if (!product) throw new Error("Product not found");

  const newQty = type === "IN" ? product.quantity + quantity : product.quantity - quantity;
  if (newQty < 0) throw new Error("Insufficient stock");

  const insertMovement = db.prepare("INSERT INTO stock_movements (product_id, type, quantity, unit_cost, case_cost, case_quantity, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  const updateProduct = db.prepare("UPDATE products SET quantity = ?, updated_at = datetime('now') WHERE id = ?");

  db.transaction(() => {
    const ts = date ? `${date} ${new Date().toTimeString().slice(0, 8)}` : undefined;
    insertMovement.run(productId, type, quantity, unitCost, caseCost, caseQuantity, note, ts || null);
    updateProduct.run(newQty, productId);
  })();

  revalidatePath("/stock");
  revalidatePath("/");
  redirect("/stock");
}

export async function processPOS(formData: FormData) {
  const itemsJson = formData.get("items") as string;
  if (!itemsJson) return { error: "No items provided" };
  let items: Array<{ productId: number; quantity: number; price: number }>;
  try {
    items = JSON.parse(itemsJson);
  } catch {
    return { error: "Invalid items data" };
  }
  if (items.length === 0) return { error: "Cart is empty" };
  const customerId = formData.get("customer_id") ? parseInt(formData.get("customer_id") as string) : null;
  const customerType = formData.get("customer_type") as string || null;

  const getProduct = db.prepare("SELECT id, name, sku, quantity, price FROM products WHERE id = ?");
  const insertMovement = db.prepare("INSERT INTO stock_movements (product_id, type, quantity, note) VALUES (?, 'OUT', ?, ?)");
  const updateStock = db.prepare("UPDATE products SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ?");

  const sale = db.transaction(() => {
    let total = 0;
    let itemCount = 0;
    const saleItems: Array<{ product_id: number; product_name: string; sku: string; price: number; quantity: number }> = [];

    for (const item of items) {
      const product = getProduct.get(item.productId) as { id: number; name: string; sku: string; quantity: number; price: number } | undefined;
      if (!product) throw new Error(`Product ${item.productId} not found`);
      if (product.quantity < item.quantity) throw new Error(`Insufficient stock for product ${item.productId}`);
      insertMovement.run(item.productId, item.quantity, "POS sale");
      updateStock.run(item.quantity, item.productId);
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      itemCount += item.quantity;
      saleItems.push({ product_id: item.productId, product_name: product.name, sku: product.sku, price: item.price, quantity: item.quantity });
    }

    const saleResult = db.prepare("INSERT INTO sales (customer_id, total, item_count, customer_type) VALUES (?, ?, ?, ?)")
      .run(customerId, total, itemCount, customerType);
    const saleId = saleResult.lastInsertRowid as number;

    const insertItem = db.prepare("INSERT INTO sale_items (sale_id, product_id, product_name, sku, price, quantity) VALUES (?, ?, ?, ?, ?, ?)");
    for (const si of saleItems) {
      insertItem.run(saleId, si.product_id, si.product_name, si.sku, si.price, si.quantity);
    }

    return { saleId, total, itemCount };
  });

  let saleResult;
  try {
    saleResult = sale();
  } catch (e) {
    return { error: (e as Error).message };
  }

  revalidatePath("/pos");
  revalidatePath("/products");
  revalidatePath("/stock");
  revalidatePath("/");
  revalidatePath("/customers");
  return { success: true, ...saleResult };
}

export async function draftOrderFromFB(orderId: number) {
  const order = db.prepare("SELECT * FROM fb_orders WHERE id = ?").get(orderId) as {
    id: number; customer_name: string; product_id: number | null; quantity: number; status: string; comment_text: string;
  } | undefined;
  if (!order) return { error: "Order not found" };
  if (order.status !== "pending") return { error: "Order already processed" };

  const getProduct = db.prepare("SELECT id, name, sku, quantity, price FROM products WHERE id = ?");
  const insertMovement = db.prepare("INSERT INTO stock_movements (product_id, type, quantity, note) VALUES (?, 'OUT', ?, ?)");
  const updateStock = db.prepare("UPDATE products SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ?");

  if (!order.product_id) return { error: "No product linked" };

  const product = getProduct.get(order.product_id) as { id: number; name: string; sku: string; quantity: number; price: number } | undefined;
  if (!product) return { error: "Product not found" };
  if (product.quantity < order.quantity) return { error: "Insufficient stock" };

  try {
    const newTotal = product.price * order.quantity;
    db.transaction(() => {
      insertMovement.run(order.product_id, order.quantity, `FB order #${order.id}: ${order.comment_text}`);
      updateStock.run(order.quantity, order.product_id);
      const saleResult = db.prepare("INSERT INTO sales (customer_id, total, item_count, customer_type) VALUES (?, ?, ?, ?)")
        .run(null, newTotal, order.quantity, null);
      const saleId = saleResult.lastInsertRowid as number;
      db.prepare("INSERT INTO sale_items (sale_id, product_id, product_name, sku, price, quantity) VALUES (?, ?, ?, ?, ?, ?)")
        .run(saleId, order.product_id, product.name, product.sku, product.price, order.quantity);
      db.prepare("UPDATE fb_orders SET status = 'processed' WHERE id = ?").run(order.id);
    })();
  } catch (e) {
    return { error: (e as Error).message };
  }

  revalidatePath("/fb-live");
  revalidatePath("/pos");
  revalidatePath("/products");
  revalidatePath("/stock");
  revalidatePath("/");
  return { success: true };
}

export async function getOrderReceipt(orderId: number) {
  const order = db.prepare(`
    SELECT o.*, p.name as product_name, p.price
    FROM fb_orders o
    LEFT JOIN products p ON p.id = o.product_id
    WHERE o.id = ?
  `).get(orderId) as {
    id: number; customer_name: string; comment_text: string;
    product_name: string | null; quantity: number; price: number | null;
    created_at: string;
  } | undefined;
  if (!order) return null;
  return order;
}

export async function resetFBOrder(orderId: number) {
  db.prepare("UPDATE fb_orders SET status = 'pending' WHERE id = ?").run(orderId);
  revalidatePath("/fb-live");
  return { success: true };
}

export async function addFBKeyword(formData: FormData) {
  const keyword = (formData.get("keyword") as string).trim().toLowerCase();
  const productId = parseInt(formData.get("productId") as string);
  const quantity = parseInt(formData.get("quantity") as string) || 1;

  if (!keyword || !productId) return { error: "Keyword and product are required" };

  try {
    db.prepare("INSERT INTO fb_keywords (keyword, product_id, quantity) VALUES (?, ?, ?)").run(keyword, productId, quantity);
  } catch (e: unknown) {
    const msg = (e as Error).message;
    if (msg.includes("UNIQUE")) return { error: "Keyword already exists" };
    return { error: msg };
  }

  revalidatePath("/fb-live");
  return { success: true };
}

export async function deleteFBKeyword(id: number) {
  db.prepare("DELETE FROM fb_keywords WHERE id = ?").run(id);
  revalidatePath("/fb-live");
}

function getSetting(key: string): string {
  const row = db.prepare("SELECT value FROM fb_settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? "";
}

export async function simulateFBComment(formData: FormData) {
  const customerName = formData.get("customer") as string;
  const comment = (formData.get("comment") as string).trim().toLowerCase();
  const matchMode = getSetting("match_mode") || "contains";

  if (!comment) return { error: "Comment is required" };

  const keywords = db.prepare(`
    SELECT f.id, f.keyword, f.product_id, f.quantity, p.name as product_name, p.quantity as stock
    FROM fb_keywords f
    JOIN products p ON p.id = f.product_id
    ORDER BY LENGTH(f.keyword) DESC
  `).all() as Array<{ id: number; keyword: string; product_id: number; quantity: number; product_name: string; stock: number }>;

  const matched = keywords.find((k) => {
    if (matchMode === "exact") return comment === k.keyword;
    if (matchMode === "starts") return comment.startsWith(k.keyword);
    return comment.includes(k.keyword);
  });

  if (!matched) {
    db.prepare("INSERT INTO fb_orders (customer_name, comment_text, status) VALUES (?, ?, 'cancelled')").run(
      customerName || "Anonymous", comment
    );
    revalidatePath("/fb-live");
    return { error: "No keyword matched", matched: false };
  }

  const orderQty = matched.quantity;
  const insufficient = matched.stock < orderQty;

  const insertOrder = db.prepare(
    "INSERT INTO fb_orders (customer_name, comment_text, keyword, product_id, quantity, status) VALUES (?, ?, ?, ?, ?, ?)"
  );
  insertOrder.run(
    customerName || "Anonymous", comment, matched.keyword, matched.product_id, orderQty,
    insufficient ? "cancelled" : "pending"
  );

  if (!insufficient) {
    const processOrder = db.transaction(() => {
      db.prepare("INSERT INTO stock_movements (product_id, type, quantity, note) VALUES (?, 'OUT', ?, ?)").run(
        matched.product_id, orderQty, `FB Live: ${matched.keyword}`
      );
      db.prepare("UPDATE products SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ?").run(
        orderQty, matched.product_id
      );
      db.prepare("UPDATE fb_orders SET status = 'processed' WHERE id = ?").run(
        (db.prepare("SELECT last_insert_rowid() as id").get() as { id: number }).id
      );
    });
    processOrder();
  }

  const autoReply = insufficient
    ? `Sorry ${customerName}, ${matched.product_name} is out of stock.`
    : getSetting("auto_reply")
        .replace("{{name}}", customerName || "there")
        .replace("{{product}}", matched.product_name)
        .replace("{{qty}}", String(orderQty));

  revalidatePath("/fb-live");
  revalidatePath("/stock");
  revalidatePath("/products");
  return { success: true, matched: matched.keyword, product: matched.product_name, qty: orderQty, insufficient, reply: autoReply };
}

export async function getFBSettings() {
  const rows = db.prepare("SELECT key, value FROM fb_settings").all() as Array<{ key: string; value: string }>;
  const settings: Record<string, string> = {};
  for (const row of rows) settings[row.key] = row.value;
  return settings;
}

export async function saveFBSettings(formData: FormData) {
  const keys = ["page_name", "page_id", "app_id", "app_secret", "access_token", "auto_reply", "auto_reply_not_found", "match_mode", "listening_enabled", "verify_token"];
  const upsert = db.prepare("INSERT OR REPLACE INTO fb_settings (key, value) VALUES (?, ?)");
  for (const key of keys) {
    const val = formData.get(key) as string;
    if (val !== null) upsert.run(key, val);
  }
  revalidatePath("/fb-live");
  revalidatePath("/fb-live/settings");
  return { success: true };
}

// ─── Facebook Login ──────────────────────────────────────────
export async function selectFBPage(formData: FormData) {
  const pageId = formData.get("page_id") as string;
  const pageName = formData.get("page_name") as string;
  const accessToken = formData.get("access_token") as string;

  const upsert = db.prepare("INSERT OR REPLACE INTO fb_settings (key, value) VALUES (?, ?)");
  upsert.run("page_id", pageId);
  upsert.run("page_name", pageName);
  upsert.run("access_token", accessToken);

  revalidatePath("/fb-live/settings");
  return { success: true };
}

// ─── Settings ────────────────────────────────────────────────
export async function getSettings() {
  const rows = db.prepare("SELECT key, value FROM settings").all() as Array<{ key: string; value: string }>;
  const s: Record<string, string> = {};
  for (const row of rows) s[row.key] = row.value;
  return s;
}

export async function saveSettings(formData: FormData) {
  const keys = [
    "printer_type", "paper_width", "receipt_header", "receipt_footer",
    "receipt_copies", "auto_print", "store_name", "store_address", "store_phone",
    "telegram_bot_token", "telegram_chat_ids", "telegram_notify_low_stock",
    "telegram_notify_daily", "telegram_enabled",
    "messenger_page_token", "messenger_greeting", "messenger_not_found", "messenger_enabled",
  ];
  const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  for (const key of keys) {
    const val = formData.get(key);
    if (val !== null) upsert.run(key, String(val));
  }
  return { success: true };
}

// ─── Receipts ────────────────────────────────────────────────
export async function saveReceipt(formData: FormData) {
  const data = formData.get("data") as string;
  const total = parseFloat(formData.get("total") as string);
  const count = parseInt(formData.get("count") as string);
  const parsed = JSON.parse(data);
  db.prepare("INSERT INTO receipts (receipt_data, total, item_count) VALUES (?, ?, ?)").run(JSON.stringify(parsed), total, count);
  return { success: true };
}

export async function getReceipts(limit = 50) {
  return db.prepare("SELECT * FROM receipts ORDER BY created_at DESC LIMIT ?").all(limit);
}

// ─── Telegram ────────────────────────────────────────────────
export async function sendTelegramNotification(message: string) {
  const token = (db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get() as { value: string } | undefined)?.value;
  const chatIds = (db.prepare("SELECT value FROM settings WHERE key = 'telegram_chat_ids'").get() as { value: string } | undefined)?.value;
  const enabled = (db.prepare("SELECT value FROM settings WHERE key = 'telegram_enabled'").get() as { value: string } | undefined)?.value === "1";
  if (!token || !chatIds || !enabled) return;

  for (const chatId of chatIds.split(",").map((s: string) => s.trim())) {
    if (!chatId) continue;
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
      });
    } catch { /* silent */ }
  }
}

// ─── Messenger (Facebook Chatbot) ────────────────────────────
export async function sendMessengerMessage(recipientId: string, text: string) {
  const token = (db.prepare("SELECT value FROM settings WHERE key = 'messenger_page_token'").get() as { value: string } | undefined)?.value;
  if (!token) return;

  try {
    await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
    });
  } catch { /* silent */ }
}

// ─── Messenger Rules (Automation) ───────────────────────────
export async function getMessengerRules() {
  return db.prepare("SELECT * FROM messenger_rules ORDER BY created_at DESC").all() as Array<{
    id: number; keyword: string; response: string; match_mode: string; category: string; enabled: number; times_triggered: number; created_at: string;
  }>;
}

export async function addMessengerRule(formData: FormData) {
  const keyword = (formData.get("keyword") as string).trim().toLowerCase();
  const response = (formData.get("response") as string).trim();
  const matchMode = formData.get("match_mode") as string || "contains";
  const category = formData.get("category") as string || "general";

  if (!keyword || !response) return { error: "Keyword and response are required" };

  db.prepare("INSERT INTO messenger_rules (keyword, response, match_mode, category) VALUES (?, ?, ?, ?)").run(keyword, response, matchMode, category);
  revalidatePath("/fb-live/automation");
  return { success: true };
}

export async function updateMessengerRule(formData: FormData) {
  const id = parseInt(formData.get("id") as string);
  const keyword = (formData.get("keyword") as string).trim().toLowerCase();
  const response = (formData.get("response") as string).trim();
  const matchMode = formData.get("match_mode") as string || "contains";
  const category = formData.get("category") as string || "general";

  db.prepare("UPDATE messenger_rules SET keyword=?, response=?, match_mode=?, category=? WHERE id=?").run(keyword, response, matchMode, category, id);
  revalidatePath("/fb-live/automation");
  return { success: true };
}

export async function deleteMessengerRule(id: number) {
  db.prepare("DELETE FROM messenger_rules WHERE id = ?").run(id);
  revalidatePath("/fb-live/automation");
}

export async function toggleMessengerRule(id: number) {
  const rule = db.prepare("SELECT enabled FROM messenger_rules WHERE id = ?").get(id) as { enabled: number } | undefined;
  if (rule) {
    db.prepare("UPDATE messenger_rules SET enabled = ? WHERE id = ?").run(rule.enabled ? 0 : 1, id);
    revalidatePath("/fb-live/automation");
  }
}

export async function testMessengerRule(formData: FormData) {
  const testText = (formData.get("test_text") as string).trim().toLowerCase();
  if (!testText) return { error: "Test text is required" };

  const rules = db.prepare("SELECT * FROM messenger_rules WHERE enabled = 1 ORDER BY created_at DESC").all() as Array<{
    id: number; keyword: string; response: string; match_mode: string; category: string;
  }>;

  const matched = rules.find((r) => {
    if (r.match_mode === "exact") return testText === r.keyword;
    if (r.match_mode === "starts") return testText.startsWith(r.keyword);
    return testText.includes(r.keyword);
  });

  if (matched) {
    db.prepare("UPDATE messenger_rules SET times_triggered = times_triggered + 1 WHERE id = ?").run(matched.id);
    return { success: true, matched: matched.keyword, response: matched.response, category: matched.category };
  }
  return { success: true, matched: null, response: null };
}

// ─── Quick Replies ──────────────────────────────────────────
export async function getQuickReplies() {
  return db.prepare("SELECT * FROM messenger_quick_replies ORDER BY created_at DESC").all() as Array<{
    id: number; title: string; text: string; payload: string;
  }>;
}

export async function addQuickReply(formData: FormData) {
  const title = (formData.get("title") as string).trim();
  const text = (formData.get("text") as string).trim();
  if (!title || !text) return { error: "Title and text are required" };
  db.prepare("INSERT INTO messenger_quick_replies (title, text) VALUES (?, ?)").run(title, text);
  revalidatePath("/fb-live/automation");
  revalidatePath("/fb-live/inbox");
  return { success: true };
}

export async function deleteQuickReply(id: number) {
  db.prepare("DELETE FROM messenger_quick_replies WHERE id = ?").run(id);
  revalidatePath("/fb-live/automation");
  revalidatePath("/fb-live/inbox");
}

// ─── FAQ (AI Knowledge Base) ─────────────────────────────────
export async function getFAQs() {
  return db.prepare("SELECT * FROM messenger_faq ORDER BY created_at DESC").all() as Array<{
    id: number; question: string; answer: string; category: string;
  }>;
}

export async function addFAQ(formData: FormData) {
  const question = (formData.get("question") as string).trim();
  const answer = (formData.get("answer") as string).trim();
  const category = formData.get("category") as string || "general";
  if (!question || !answer) return { error: "Question and answer are required" };
  db.prepare("INSERT INTO messenger_faq (question, answer, category) VALUES (?, ?, ?)").run(question, answer, category);
  revalidatePath("/fb-live/ai");
  return { success: true };
}

export async function deleteFAQ(id: number) {
  db.prepare("DELETE FROM messenger_faq WHERE id = ?").run(id);
  revalidatePath("/fb-live/ai");
}

// ─── Messenger Conversations (Inbox) ─────────────────────────
export async function getConversations() {
  return db.prepare("SELECT * FROM messenger_conversations ORDER BY updated_at DESC LIMIT 50").all() as Array<{
    id: number; sender_id: string; sender_name: string; last_message: string; unread: number; tags: string; assigned_to: string; updated_at: string;
  }>;
}

export async function searchConversations(formData: FormData) {
  const query = (formData.get("query") as string).trim();
  if (!query) return [];
  return db.prepare(
    "SELECT * FROM messenger_conversations WHERE sender_name LIKE ? OR last_message LIKE ? OR tags LIKE ? ORDER BY updated_at DESC LIMIT 50"
  ).all(`%${query}%`, `%${query}%`, `%${query}%`) as Array<{
    id: number; sender_id: string; sender_name: string; last_message: string; unread: number; tags: string; assigned_to: string; updated_at: string;
  }>;
}

export async function getConversationMessages(conversationId: number) {
  return db.prepare("SELECT * FROM messenger_messages WHERE conversation_id = ? ORDER BY created_at ASC").all(conversationId) as Array<{
    id: number; sender: string; text: string; created_at: string;
  }>;
}

export async function replyToConversation(formData: FormData) {
  const conversationId = parseInt(formData.get("conversation_id") as string);
  const text = (formData.get("text") as string).trim();

  if (!text) return { error: "Message is required" };

  db.prepare("INSERT INTO messenger_messages (conversation_id, sender, text) VALUES (?, 'bot', ?)").run(conversationId, text);
  db.prepare("UPDATE messenger_conversations SET last_message = ?, updated_at = datetime('now'), unread = 0 WHERE id = ?").run(text, conversationId);

  const conversation = db.prepare("SELECT sender_id FROM messenger_conversations WHERE id = ?").get(conversationId) as { sender_id: string } | undefined;
  if (conversation) {
    await sendMessengerMessage(conversation.sender_id, text);
  }

  revalidatePath("/fb-live/inbox");
  return { success: true };
}

export async function markConversationRead(id: number) {
  db.prepare("UPDATE messenger_conversations SET unread = 0 WHERE id = ?").run(id);
  revalidatePath("/fb-live/inbox");
}

export async function assignConversation(formData: FormData) {
  const id = parseInt(formData.get("id") as string);
  const assignedTo = (formData.get("assigned_to") as string).trim();
  db.prepare("UPDATE messenger_conversations SET assigned_to = ? WHERE id = ?").run(assignedTo, id);
  revalidatePath("/fb-live/inbox");
}

export async function tagConversation(formData: FormData) {
  const id = parseInt(formData.get("id") as string);
  const tags = (formData.get("tags") as string).trim();
  db.prepare("UPDATE messenger_conversations SET tags = ? WHERE id = ?").run(tags, id);
  revalidatePath("/fb-live/inbox");
}

// ─── Messenger Broadcasts ────────────────────────────────────
export async function getBroadcasts() {
  return db.prepare("SELECT * FROM messenger_broadcasts ORDER BY created_at DESC LIMIT 50").all() as Array<{
    id: number; name: string; message: string; recipient_count: number; sent_count: number; status: string; scheduled_at: string | null; created_at: string;
  }>;
}

export async function createBroadcast(formData: FormData) {
  const name = (formData.get("name") as string).trim() || "Untitled";
  const message = (formData.get("message") as string).trim();
  const scheduledAt = (formData.get("scheduled_at") as string) || null;
  if (!message) return { error: "Message is required" };

  db.prepare("INSERT INTO messenger_broadcasts (name, message, status, scheduled_at) VALUES (?, ?, 'draft', ?)").run(name, message, scheduledAt);
  revalidatePath("/fb-live/broadcasts");
  return { success: true };
}

export async function updateBroadcast(formData: FormData) {
  const id = parseInt(formData.get("id") as string);
  const name = (formData.get("name") as string).trim() || "Untitled";
  const message = (formData.get("message") as string).trim();
  if (!message) return { error: "Message is required" };
  db.prepare("UPDATE messenger_broadcasts SET name=?, message=? WHERE id=?").run(name, message, id);
  revalidatePath("/fb-live/broadcasts");
  return { success: true };
}

export async function sendBroadcast(id: number) {
  const broadcast = db.prepare("SELECT * FROM messenger_broadcasts WHERE id = ?").get(id) as { id: number; message: string; name: string } | undefined;
  if (!broadcast) return { error: "Broadcast not found" };

  db.prepare("UPDATE messenger_broadcasts SET status = 'sending' WHERE id = ?").run(id);

  const conversations = db.prepare("SELECT sender_id, sender_name FROM messenger_conversations").all() as Array<{ sender_id: string; sender_name: string }>;
  const token = (db.prepare("SELECT value FROM settings WHERE key = 'messenger_page_token'").get() as { value: string } | undefined)?.value;

  let sentCount = 0;
  if (token) {
    for (const conv of conversations) {
      try {
        await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipient: { id: conv.sender_id }, message: { text: broadcast.message } }),
        });
        sentCount++;
      } catch { /* silent */ }
    }
  }

  db.prepare("UPDATE messenger_broadcasts SET status = 'sent', sent_count = ?, recipient_count = ? WHERE id = ?").run(sentCount, conversations.length, id);
  revalidatePath("/fb-live/broadcasts");
  return { success: true, sent: sentCount, total: conversations.length };
}

export async function deleteBroadcast(id: number) {
  db.prepare("DELETE FROM messenger_broadcasts WHERE id = ?").run(id);
  revalidatePath("/fb-live/broadcasts");
}

// ─── Message Templates ───────────────────────────────────────
export async function getTemplates() {
  return db.prepare("SELECT * FROM messenger_templates ORDER BY created_at DESC").all() as Array<{
    id: number; name: string; message: string;
  }>;
}

export async function addTemplate(formData: FormData) {
  const name = (formData.get("name") as string).trim();
  const message = (formData.get("message") as string).trim();
  if (!name || !message) return { error: "Name and message are required" };
  db.prepare("INSERT INTO messenger_templates (name, message) VALUES (?, ?)").run(name, message);
  revalidatePath("/fb-live/broadcasts");
  return { success: true };
}

export async function deleteTemplate(id: number) {
  db.prepare("DELETE FROM messenger_templates WHERE id = ?").run(id);
  revalidatePath("/fb-live/broadcasts");
}

// ─── AI Settings ─────────────────────────────────────────────
export async function saveAISettings(formData: FormData) {
  const keys = ["ai_provider", "ai_model", "ai_system_prompt", "ai_temperature", "ai_max_tokens", "ai_enabled", "ai_persona_tone", "ai_context_messages"];
  const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  for (const key of keys) {
    const val = formData.get(key);
    if (val !== null) upsert.run(key, String(val));
  }
  revalidatePath("/fb-live/ai");
  return { success: true };
}

// ─── Messenger Settings ──────────────────────────────────────
export async function saveMessengerSettings(formData: FormData) {
  const keys = ["messenger_page_token", "messenger_greeting", "messenger_not_found", "messenger_enabled"];
  const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  for (const key of keys) {
    const val = formData.get(key);
    if (val !== null) upsert.run(key, String(val));
  }
  revalidatePath("/fb-live/settings");
  return { success: true };
}

export async function createSupplier(formData: FormData) {
  db.prepare("INSERT INTO suppliers (name, email, phone, address) VALUES (?, ?, ?, ?)").run(
    formData.get("name"),
    formData.get("email"),
    formData.get("phone"),
    formData.get("address"),
  );
  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function updateSupplier(id: number, formData: FormData) {
  db.prepare("UPDATE suppliers SET name=?, email=?, phone=?, address=?, updated_at=datetime('now') WHERE id=?").run(
    formData.get("name"),
    formData.get("email"),
    formData.get("phone"),
    formData.get("address"),
    id,
  );
  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function deleteSupplier(id: number) {
  db.prepare("UPDATE products SET supplier_id = NULL WHERE supplier_id = ?").run(id);
  db.prepare("DELETE FROM suppliers WHERE id = ?").run(id);
  revalidatePath("/suppliers");
  redirect("/suppliers");
}

// ─── Customers ────────────────────────────────────────────────
export async function getCustomers() {
  return db.prepare("SELECT * FROM customers ORDER BY name ASC").all() as Array<{
    id: number; name: string; phone: string | null; email: string | null; address: string | null;
    customer_type: string; credit: number; created_at: string; updated_at: string;
  }>;
}

export async function getCustomer(id: number) {
  return db.prepare("SELECT * FROM customers WHERE id = ?").get(id) as {
    id: number; name: string; phone: string | null; email: string | null; address: string | null;
    customer_type: string; credit: number; created_at: string; updated_at: string;
  } | undefined;
}

export async function saveCustomer(formData: FormData) {
  const id = formData.get("id") ? parseInt(formData.get("id") as string) : null;
  const name = (formData.get("name") as string).trim();
  const phone = (formData.get("phone") as string).trim() || null;
  const email = (formData.get("email") as string).trim() || null;
  const address = (formData.get("address") as string).trim() || null;
  const customerType = (formData.get("customer_type") as string) || "retail";
  const credit = parseFloat(formData.get("credit") as string) || 0;

  if (!name) return { error: "Name is required" };

  if (id) {
    db.prepare("UPDATE customers SET name=?, phone=?, email=?, address=?, customer_type=?, credit=?, updated_at=datetime('now') WHERE id=?")
      .run(name, phone, email, address, customerType, credit, id);
    revalidatePath("/customers");
    redirect("/customers");
  } else {
    db.prepare("INSERT INTO customers (name, phone, email, address, customer_type, credit) VALUES (?, ?, ?, ?, ?, ?)")
      .run(name, phone, email, address, customerType, credit);
    revalidatePath("/customers");
    redirect("/customers");
  }
}

export async function deleteCustomer(id: number) {
  db.prepare("DELETE FROM customers WHERE id = ?").run(id);
  revalidatePath("/customers");
  redirect("/customers");
}

export async function getSales(limit = 100) {
  return db.prepare(`
    SELECT s.*, c.name as customer_name
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id
    ORDER BY s.created_at DESC LIMIT ?
  `).all(limit) as Array<{
    id: number; customer_id: number | null; total: number; item_count: number;
    customer_type: string | null; created_at: string; customer_name: string | null;
  }>;
}

export async function getSaleItems(saleId: number) {
  return db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(saleId) as Array<{
    id: number; sale_id: number; product_id: number; product_name: string;
    sku: string | null; price: number; quantity: number;
  }>;
}

// === DEBTS ===
export async function createDebt(formData: FormData) {
  const type = formData.get("type") as string;
  const reference_id = parseInt(formData.get("reference_id") as string);
  const amount = parseFloat(formData.get("amount") as string);
  const due_date = formData.get("due_date") as string || null;
  const note = formData.get("note") as string || null;
  if (!type || !reference_id || !amount) return { error: "Missing required fields" };
  db.prepare("INSERT INTO debts (type, reference_id, amount, due_date, note) VALUES (?, ?, ?, ?, ?)").run(type, reference_id, amount, due_date, note);
  revalidatePath("/debts");
  redirect("/debts");
}

export async function addDebtPayment(formData: FormData) {
  const debt_id = parseInt(formData.get("debt_id") as string);
  const amount = parseFloat(formData.get("amount") as string);
  if (!debt_id || !amount) return { error: "Missing fields" };
  const paymentMethod = formData.get("payment_method") as string || "cash";
  const note = formData.get("note") as string || null;
  db.transaction(() => {
    db.prepare("INSERT INTO debt_payments (debt_id, amount, payment_method, note) VALUES (?, ?, ?, ?)").run(debt_id, amount, paymentMethod, note);
    const debt = db.prepare("SELECT amount, paid_amount FROM debts WHERE id = ?").get(debt_id) as any;
    const newPaid = debt.paid_amount + amount;
    const status = newPaid >= debt.amount ? "paid" : "partial";
    db.prepare("UPDATE debts SET paid_amount = ?, status = ? WHERE id = ?").run(newPaid, status, debt_id);
  })();
  revalidatePath("/debts");
  redirect("/debts");
}

// === CASH FLOW ===
export async function createCashFlowEntry(formData: FormData) {
  const type = formData.get("type") as string;
  const category = formData.get("category") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const description = formData.get("description") as string || null;
  if (!type || !category || !amount) return { error: "Missing fields" };
  db.prepare("INSERT INTO cash_flow (type, category, amount, description) VALUES (?, ?, ?, ?)").run(type, category, amount, description);
  revalidatePath("/cash-flow");
  redirect("/cash-flow");
}

// === STOCK CHECKS ===
export async function createStockCheck(formData: FormData) {
  const name = formData.get("name") as string;
  if (!name) return { error: "Name required" };
  const result = db.prepare("INSERT INTO stock_checks (name) VALUES (?)").run(name);
  const checkId = result.lastInsertRowid as number;
  const products = db.prepare("SELECT id, name, quantity FROM products ORDER BY name ASC").all() as any[];
  const insert = db.prepare("INSERT INTO stock_check_items (stock_check_id, product_id, expected_qty) VALUES (?, ?, ?)");
  for (const p of products) insert.run(checkId, p.id, p.quantity);
  revalidatePath("/stock-check");
  redirect(`/stock-check/${checkId}`);
}

export async function updateStockCheckItem(formData: FormData) {
  const itemId = parseInt(formData.get("item_id") as string);
  const actualQty = parseFloat(formData.get("actual_qty") as string);
  if (!itemId || isNaN(actualQty)) return { error: "Invalid data" };
  const item = db.prepare("SELECT sci.*, p.quantity FROM stock_check_items sci JOIN products p ON p.id = sci.product_id WHERE sci.id = ?").get(itemId) as any;
  const difference = actualQty - item.expected_qty;
  db.prepare("UPDATE stock_check_items SET actual_qty = ?, difference = ? WHERE id = ?").run(actualQty, difference, itemId);
  revalidatePath(`/stock-check/${item.stock_check_id}`);
}

export async function completeStockCheck(formData: FormData) {
  const checkId = parseInt(formData.get("check_id") as string);
  if (!checkId) return { error: "Missing check ID" };
  db.prepare("UPDATE stock_checks SET status = 'completed', completed_at = datetime('now') WHERE id = ?").run(checkId);
  revalidatePath("/stock-check");
  redirect("/stock-check");
}

// === CUSTOMER ORDERS ===
export async function createCustomerOrder(formData: FormData) {
  const customer_id = formData.get("customer_id") ? parseInt(formData.get("customer_id") as string) : null;
  const delivery_address = formData.get("delivery_address") as string || null;
  const delivery_fee = parseFloat(formData.get("delivery_fee") as string) || 0;
  const note = formData.get("note") as string || null;
  const itemsJson = formData.get("items") as string;
  if (!itemsJson) return { error: "No items" };
  const items = JSON.parse(itemsJson) as Array<{ product_id: number; product_name: string; price: number; quantity: number }>;
  if (items.length === 0) return { error: "Cart empty" };
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  db.transaction(() => {
    const result = db.prepare("INSERT INTO customer_orders (customer_id, total, delivery_address, delivery_fee, note) VALUES (?, ?, ?, ?, ?)").run(customer_id, total + delivery_fee, delivery_address, delivery_fee, note);
    const orderId = result.lastInsertRowid as number;
    const insert = db.prepare("INSERT INTO customer_order_items (order_id, product_id, product_name, price, quantity) VALUES (?, ?, ?, ?, ?)");
    for (const item of items) insert.run(orderId, item.product_id, item.product_name, item.price, item.quantity);
  })();
  revalidatePath("/orders");
  redirect("/orders");
}

export async function updateOrderStatus(formData: FormData) {
  const orderId = parseInt(formData.get("order_id") as string);
  const status = formData.get("status") as string;
  if (!orderId || !status) return { error: "Missing fields" };
  db.prepare("UPDATE customer_orders SET status = ? WHERE id = ?").run(status, orderId);
  revalidatePath("/orders");
}

// === DELIVERY PARTNERS ===
export async function createDeliveryPartner(formData: FormData) {
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string || null;
  const commission_type = formData.get("commission_type") as string || "fixed";
  const commission_value = parseFloat(formData.get("commission_value") as string) || 0;
  if (!name) return { error: "Name required" };
  db.prepare("INSERT INTO delivery_partners (name, phone, commission_type, commission_value) VALUES (?, ?, ?, ?)").run(name, phone, commission_type, commission_value);
  revalidatePath("/delivery");
  redirect("/delivery");
}

export async function createDelivery(formData: FormData) {
  const order_id = formData.get("order_id") ? parseInt(formData.get("order_id") as string) : null;
  const partner_id = formData.get("partner_id") ? parseInt(formData.get("partner_id") as string) : null;
  const fee = parseFloat(formData.get("fee") as string) || 0;
  const note = formData.get("note") as string || null;
  db.prepare("INSERT INTO deliveries (order_id, partner_id, fee, note) VALUES (?, ?, ?, ?)").run(order_id, partner_id, fee, note);
  revalidatePath("/delivery");
  redirect("/delivery");
}

// === PROMOTIONS ===
export async function createPromotion(formData: FormData) {
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const value = parseFloat(formData.get("value") as string) || 0;
  const min_purchase = parseFloat(formData.get("min_purchase") as string) || 0;
  const start_date = formData.get("start_date") as string || null;
  const end_date = formData.get("end_date") as string || null;
  const product_id = formData.get("product_id") ? parseInt(formData.get("product_id") as string) : null;
  const buy_qty = parseInt(formData.get("buy_qty") as string) || 0;
  const get_qty = parseInt(formData.get("get_qty") as string) || 0;
  if (!name || !type) return { error: "Missing fields" };
  db.prepare("INSERT INTO promotions (name, type, value, min_purchase, start_date, end_date, product_id, buy_qty, get_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(name, type, value, min_purchase, start_date, end_date, product_id, buy_qty, get_qty);
  revalidatePath("/promotions");
  redirect("/promotions");
}

// === MEMBERSHIP ===
export async function createMembershipTier(formData: FormData) {
  const name = formData.get("name") as string;
  const min_spend = parseFloat(formData.get("min_spend") as string) || 0;
  const discount_percent = parseFloat(formData.get("discount_percent") as string) || 0;
  const benefits = formData.get("benefits") as string || null;
  if (!name) return { error: "Name required" };
  db.prepare("INSERT INTO membership_tiers (name, min_spend, discount_percent, benefits) VALUES (?, ?, ?, ?)").run(name, min_spend, discount_percent, benefits);
  revalidatePath("/membership");
  redirect("/membership");
}

export async function enrollMember(formData: FormData) {
  const customer_id = parseInt(formData.get("customer_id") as string);
  const tier_id = formData.get("tier_id") ? parseInt(formData.get("tier_id") as string) : null;
  if (!customer_id) return { error: "Customer required" };
  db.prepare("INSERT OR IGNORE INTO members (customer_id, tier_id) VALUES (?, ?)").run(customer_id, tier_id);
  revalidatePath("/membership");
}
