"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";

export async function createProduct(formData: FormData) {
  const stmt = db.prepare(`
    INSERT INTO products (name, sku, price, cost_price, selling_price, original_price, unit_price, price_per_case, quantity, description, category, min_stock, supplier_id, barcode, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  await stmt.run(
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
  await stmt.run(
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
  await db.prepare("DELETE FROM stock_movements WHERE product_id = ?").run(id);
  await db.prepare("DELETE FROM products WHERE id = ?").run(id);
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

  const product = await db.prepare("SELECT * FROM products WHERE id = ?").get(productId) as { quantity: number } | undefined;
  if (!product) throw new Error("Product not found");

  const newQty = type === "IN" ? product.quantity + quantity : product.quantity - quantity;
  if (newQty < 0) throw new Error("Insufficient stock");

  const insertMovement = db.prepare("INSERT INTO stock_movements (product_id, type, quantity, unit_cost, case_cost, case_quantity, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  const updateProduct = db.prepare("UPDATE products SET quantity = ?, updated_at = datetime('now') WHERE id = ?");

  await db.transaction(async () => {
    const ts = date ? `${date} ${new Date().toTimeString().slice(0, 8)}` : undefined;
    await insertMovement.run(productId, type, quantity, unitCost, caseCost, caseQuantity, note, ts || null);
    await updateProduct.run(newQty, productId);
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

  const sale = db.transaction(async () => {
    let total = 0;
    let itemCount = 0;
    const saleItems: Array<{ product_id: number; product_name: string; sku: string; price: number; quantity: number }> = [];

    for (const item of items) {
      const product = await getProduct.get(item.productId) as { id: number; name: string; sku: string; quantity: number; price: number } | undefined;
      if (!product) throw new Error(`Product ${item.productId} not found`);
      if (product.quantity < item.quantity) throw new Error(`Insufficient stock for product ${item.productId}`);
      await insertMovement.run(item.productId, item.quantity, "POS sale");
      await updateStock.run(item.quantity, item.productId);
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      itemCount += item.quantity;
      saleItems.push({ product_id: item.productId, product_name: product.name, sku: product.sku, price: item.price, quantity: item.quantity });
    }

    const saleResult = await db.prepare("INSERT INTO sales (customer_id, total, item_count, customer_type) VALUES (?, ?, ?, ?)")
      .run(customerId, total, itemCount, customerType);
    const saleId = saleResult.lastInsertRowid as number;

    const insertItem = db.prepare("INSERT INTO sale_items (sale_id, product_id, product_name, sku, price, quantity) VALUES (?, ?, ?, ?, ?, ?)");
    for (const si of saleItems) {
      await insertItem.run(saleId, si.product_id, si.product_name, si.sku, si.price, si.quantity);
    }

    return { saleId, total, itemCount };
  });

  let saleResult;
  try {
    saleResult = await sale();
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

// ─── Settings ────────────────────────────────────────────────
export async function getSettings() {
  const rows = await db.prepare("SELECT key, value FROM settings").all() as Array<{ key: string; value: string }>;
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
    ];
  const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  for (const key of keys) {
    const val = formData.get(key);
    if (val !== null) await upsert.run(key, String(val));
  }
  return { success: true };
}

// ─── Receipts ────────────────────────────────────────────────
export async function saveReceipt(formData: FormData) {
  const data = formData.get("data") as string;
  const total = parseFloat(formData.get("total") as string);
  const count = parseInt(formData.get("count") as string);
  const parsed = JSON.parse(data);
  await db.prepare("INSERT INTO receipts (receipt_data, total, item_count) VALUES (?, ?, ?)").run(JSON.stringify(parsed), total, count);
  return { success: true };
}

export async function getReceipts(limit = 50) {
  return await db.prepare("SELECT * FROM receipts ORDER BY created_at DESC LIMIT ?").all(limit);
}

// ─── Telegram ────────────────────────────────────────────────
export async function sendTelegramNotification(message: string) {
  const token = (await db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get() as { value: string } | undefined)?.value;
  const chatIds = (await db.prepare("SELECT value FROM settings WHERE key = 'telegram_chat_ids'").get() as { value: string } | undefined)?.value;
  const enabled = (await db.prepare("SELECT value FROM settings WHERE key = 'telegram_enabled'").get() as { value: string } | undefined)?.value === "1";
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


export async function createSupplier(formData: FormData) {
  await db.prepare("INSERT INTO suppliers (name, email, phone, address) VALUES (?, ?, ?, ?)").run(
    formData.get("name"),
    formData.get("email"),
    formData.get("phone"),
    formData.get("address"),
  );
  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function updateSupplier(id: number, formData: FormData) {
  await db.prepare("UPDATE suppliers SET name=?, email=?, phone=?, address=?, updated_at=datetime('now') WHERE id=?").run(
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
  await db.prepare("UPDATE products SET supplier_id = NULL WHERE supplier_id = ?").run(id);
  await db.prepare("DELETE FROM suppliers WHERE id = ?").run(id);
  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function getCustomers() {
  return await db.prepare("SELECT * FROM customers ORDER BY name ASC").all() as Array<{
    id: number; name: string; phone: string | null; email: string | null; address: string | null;
    customer_type: string; credit: number; created_at: string; updated_at: string;
  }>;
}

export async function getCustomer(id: number) {
  return await db.prepare("SELECT * FROM customers WHERE id = ?").get(id) as {
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
    await db.prepare("UPDATE customers SET name=?, phone=?, email=?, address=?, customer_type=?, credit=?, updated_at=datetime('now') WHERE id=?")
      .run(name, phone, email, address, customerType, credit, id);
    revalidatePath("/customers");
    redirect("/customers");
  } else {
    await db.prepare("INSERT INTO customers (name, phone, email, address, customer_type, credit) VALUES (?, ?, ?, ?, ?, ?)")
      .run(name, phone, email, address, customerType, credit);
    revalidatePath("/customers");
    redirect("/customers");
  }
}

export async function deleteCustomer(id: number) {
  await db.prepare("DELETE FROM customers WHERE id = ?").run(id);
  revalidatePath("/customers");
  redirect("/customers");
}

export async function getSales(limit = 100) {
  return await db.prepare(`
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
  return await db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(saleId) as Array<{
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
  if (!type || !reference_id || !amount) throw new Error("Missing required fields");
  await db.prepare("INSERT INTO debts (type, reference_id, amount, due_date, note) VALUES (?, ?, ?, ?, ?)").run(type, reference_id, amount, due_date, note);
  revalidatePath("/debts");
  redirect("/debts");
}

export async function addDebtPayment(formData: FormData) {
  const debt_id = parseInt(formData.get("debt_id") as string);
  const amount = parseFloat(formData.get("amount") as string);
  if (!debt_id || !amount) throw new Error("Missing fields");
  const paymentMethod = formData.get("payment_method") as string || "cash";
  const note = formData.get("note") as string || null;
  await db.transaction(async () => {
    await db.prepare("INSERT INTO debt_payments (debt_id, amount, payment_method, note) VALUES (?, ?, ?, ?)").run(debt_id, amount, paymentMethod, note);
    const debt = await db.prepare("SELECT amount, paid_amount FROM debts WHERE id = ?").get(debt_id) as any;
    const newPaid = debt.paid_amount + amount;
    const status = newPaid >= debt.amount ? "paid" : "partial";
    await db.prepare("UPDATE debts SET paid_amount = ?, status = ? WHERE id = ?").run(newPaid, status, debt_id);
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
  if (!type || !category || !amount) throw new Error("Missing fields");
  await db.prepare("INSERT INTO cash_flow (type, category, amount, description) VALUES (?, ?, ?, ?)").run(type, category, amount, description);
  revalidatePath("/cash-flow");
  redirect("/cash-flow");
}

// === PHYSICAL AUDITS ===
export async function clearAllAudits() {
  const audits = await db.prepare("SELECT id FROM physical_audits").all() as any[];
  const deleteItems = db.prepare("DELETE FROM physical_audit_items WHERE audit_id = ?");
  const deleteAudit = db.prepare("DELETE FROM physical_audits WHERE id = ?");
  for (const a of audits) {
    await deleteItems.run(a.id);
    await deleteAudit.run(a.id);
  }
  revalidatePath("/audit");
}

export async function createAudit(formData: FormData) {
  const name = formData.get("name") as string;
  if (!name) throw new Error("Name required");
  const result = await db.prepare("INSERT INTO physical_audits (name) VALUES (?)").run(name);
  const auditId = result.lastInsertRowid as number;
  const products = await db.prepare("SELECT id, name, quantity FROM products ORDER BY name ASC").all() as any[];
  const insert = db.prepare("INSERT INTO physical_audit_items (audit_id, product_id, expected_qty) VALUES (?, ?, ?)");
  for (const p of products) await insert.run(auditId, p.id, p.quantity);
  revalidatePath("/audit");
  redirect(`/audit/${auditId}`);
}

export async function updateAuditItem(formData: FormData) {
  const itemId = parseInt(formData.get("item_id") as string);
  const actualQty = parseFloat(formData.get("actual_qty") as string);
  const note = formData.get("note") as string || null;
  if (!itemId || isNaN(actualQty)) throw new Error("Invalid data");
  const item = await db.prepare("SELECT aai.*, p.quantity FROM physical_audit_items aai JOIN products p ON p.id = aai.product_id WHERE aai.id = ?").get(itemId) as any;
  const difference = actualQty - item.expected_qty;
  await db.prepare("UPDATE physical_audit_items SET actual_qty = ?, difference = ?, note = ? WHERE id = ?").run(actualQty, difference, note, itemId);
  revalidatePath(`/audit/${item.audit_id}`);
}

export async function completeAudit(formData: FormData) {
  const auditId = parseInt(formData.get("audit_id") as string);
  if (!auditId) throw new Error("Missing audit ID");
  await db.prepare("UPDATE physical_audits SET status = 'completed', completed_at = datetime('now') WHERE id = ?").run(auditId);
  revalidatePath("/audit");
  redirect("/audit");
}

export async function applyAuditCorrections(formData: FormData) {
  const auditId = parseInt(formData.get("audit_id") as string);
  if (!auditId) throw new Error("Missing audit ID");
  const items = await db.prepare(`
    SELECT aai.product_id, aai.actual_qty, p.quantity as current_qty
    FROM physical_audit_items aai
    JOIN products p ON p.id = aai.product_id
    WHERE aai.audit_id = ? AND aai.actual_qty IS NOT NULL AND aai.difference != 0
  `).all(auditId) as any[];
  const update = db.prepare("UPDATE products SET quantity = ? WHERE id = ?");
  for (const item of items) {
    await update.run(item.actual_qty, item.product_id);
  }
  revalidatePath("/audit");
  redirect(`/audit/${auditId}`);
}

// === CUSTOMER ORDERS ===
export async function createCustomerOrder(formData: FormData) {
  const customer_id = formData.get("customer_id") ? parseInt(formData.get("customer_id") as string) : null;
  const delivery_address = formData.get("delivery_address") as string || null;
  const delivery_fee = parseFloat(formData.get("delivery_fee") as string) || 0;
  const note = formData.get("note") as string || null;
  const itemsJson = formData.get("items") as string;
  if (!itemsJson) throw new Error("No items");
  const items = JSON.parse(itemsJson) as Array<{ product_id: number; product_name: string; price: number; quantity: number }>;
  if (items.length === 0) throw new Error("Cart empty");
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  await db.transaction(async () => {
    const result = await db.prepare("INSERT INTO customer_orders (customer_id, total, delivery_address, delivery_fee, note) VALUES (?, ?, ?, ?, ?)").run(customer_id, total + delivery_fee, delivery_address, delivery_fee, note);
    const orderId = result.lastInsertRowid as number;
    const insert = db.prepare("INSERT INTO customer_order_items (order_id, product_id, product_name, price, quantity) VALUES (?, ?, ?, ?, ?)");
    for (const item of items) await insert.run(orderId, item.product_id, item.product_name, item.price, item.quantity);
  })();
  revalidatePath("/orders");
  redirect("/orders");
}

export async function updateOrderStatus(formData: FormData) {
  const orderId = parseInt(formData.get("order_id") as string);
  const status = formData.get("status") as string;
  if (!orderId || !status) throw new Error("Missing fields");
  await db.prepare("UPDATE customer_orders SET status = ? WHERE id = ?").run(status, orderId);
  revalidatePath("/orders");
}

export async function convertOrderToSale(orderId: number) {
  const order = await db.prepare("SELECT * FROM customer_orders WHERE id = ?").get(orderId) as any;
  if (!order) return { error: "Order not found" };
  if (order.sale_id) return { error: "Already converted to sale" };

  const items = await db.prepare("SELECT * FROM customer_order_items WHERE order_id = ?").all(orderId) as any[];
  if (items.length === 0) return { error: "No items in order" };

  const insertMovement = db.prepare("INSERT INTO stock_movements (product_id, type, quantity, note) VALUES (?, 'OUT', ?, ?)");
  const updateStock = db.prepare("UPDATE products SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ?");
  const getProduct = db.prepare("SELECT id, quantity, price FROM products WHERE id = ?");

  try {
    await db.transaction(async () => {
      for (const item of items) {
        const product = await getProduct.get(item.product_id) as any;
        if (product && product.quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${item.product_name}`);
        }
        if (product) {
          await insertMovement.run(item.product_id, item.quantity, `Customer order #${orderId}: ${item.product_name}`);
          await updateStock.run(item.quantity, item.product_id);
        }
      }
      const saleResult = await db.prepare("INSERT INTO sales (customer_id, total, item_count) VALUES (?, ?, ?)")
        .run(order.customer_id, order.total, items.length);
      const saleId = saleResult.lastInsertRowid as number;
      const insert = db.prepare("INSERT INTO sale_items (sale_id, product_id, product_name, sku, price, quantity) VALUES (?, ?, ?, ?, ?, ?)");
      for (const item of items) {
        const product = await getProduct.get(item.product_id) as any;
        await insert.run(saleId, item.product_id, item.product_name, product?.sku || null, item.price, item.quantity);
      }
      await db.prepare("UPDATE customer_orders SET sale_id = ?, status = 'delivered' WHERE id = ?").run(saleId, orderId);
    })();
  } catch (e) {
    return { error: (e as Error).message };
  }

  revalidatePath("/orders");
  revalidatePath("/pos");
  return { success: true };
}

export async function getCustomerOrderReceipt(orderId: number) {
  const order = await db.prepare(`
    SELECT co.*, c.name as customer_name
    FROM customer_orders co
    LEFT JOIN customers c ON c.id = co.customer_id
    WHERE co.id = ?
  `).get(orderId) as any;
  if (!order) return null;
  const items = await db.prepare("SELECT * FROM customer_order_items WHERE order_id = ?").all(orderId) as any[];
  return { ...order, items };
}

// === DELIVERY PARTNERS ===
export async function createDeliveryPartner(formData: FormData) {
  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string || null;
  const commission_type = formData.get("commission_type") as string || "fixed";
  const commission_value = parseFloat(formData.get("commission_value") as string) || 0;
  if (!name) throw new Error("Name required");
  await db.prepare("INSERT INTO delivery_partners (name, phone, commission_type, commission_value) VALUES (?, ?, ?, ?)").run(name, phone, commission_type, commission_value);
  revalidatePath("/delivery");
  redirect("/delivery");
}

export async function createDelivery(formData: FormData) {
  const order_id = formData.get("order_id") ? parseInt(formData.get("order_id") as string) : null;
  const partner_id = formData.get("partner_id") ? parseInt(formData.get("partner_id") as string) : null;
  const fee = parseFloat(formData.get("fee") as string) || 0;
  const note = formData.get("note") as string || null;
  await db.prepare("INSERT INTO deliveries (order_id, partner_id, fee, note) VALUES (?, ?, ?, ?)").run(order_id, partner_id, fee, note);
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
  if (!name || !type) throw new Error("Missing fields");
  await db.prepare("INSERT INTO promotions (name, type, value, min_purchase, start_date, end_date, product_id, buy_qty, get_qty) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
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
  if (!name) throw new Error("Name required");
  await db.prepare("INSERT INTO membership_tiers (name, min_spend, discount_percent, benefits) VALUES (?, ?, ?, ?)").run(name, min_spend, discount_percent, benefits);
  revalidatePath("/membership");
  redirect("/membership");
}

export async function enrollMember(formData: FormData) {
  const customer_id = parseInt(formData.get("customer_id") as string);
  const tier_id = formData.get("tier_id") ? parseInt(formData.get("tier_id") as string) : null;
  if (!customer_id) return { error: "Customer required" };
  await db.prepare("INSERT OR IGNORE INTO members (customer_id, tier_id) VALUES (?, ?)").run(customer_id, tier_id);
  revalidatePath("/membership");
}
