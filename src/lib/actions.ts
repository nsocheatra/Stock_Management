"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { requirePermission } from "@/lib/auth";
import {
  generateStockNotificationsData,
  getNotifications as getNotificationsData,
  getUnreadNotificationCount as getUnreadNotificationCountData,
  markNotificationRead as markNotificationReadData,
  markAllNotificationsRead as markAllNotificationsReadData,
  clearAllNotifications as clearAllNotificationsData,
} from "./notifications-data";

export async function createProduct(formData: FormData) {
  const track_batches = formData.get("track_batches") === "1" ? 1 : 0;
  const stmt = db.prepare(`
    INSERT INTO products (name, sku, price, cost_price, selling_price, original_price, unit_price, price_per_case, quantity, description, category, min_stock, supplier_id, barcode, image_url, track_batches)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = await stmt.run(
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
    track_batches,
  );
  const streamKey = (formData.get("stream_key") as string)?.trim().toLowerCase();
  if (streamKey) {
    const streamQty = parseInt(formData.get("stream_qty") as string) || 1;
    try {
      await db.prepare("INSERT INTO fb_keywords (keyword, product_id, quantity) VALUES (?, ?, ?)").run(streamKey, Number(result.lastInsertRowid), streamQty);
    } catch {
      // keyword already exists, skip
    }
  }
  revalidatePath("/products");
  redirect("/products");
}

export async function updateProduct(id: number, formData: FormData) {
  const track_batches = formData.get("track_batches") === "1" ? 1 : 0;
  const stmt = db.prepare(`
    UPDATE products SET name=?, sku=?, price=?, cost_price=?, selling_price=?, original_price=?, unit_price=?, price_per_case=?, quantity=?, description=?, category=?, min_stock=?, supplier_id=?, barcode=?, image_url=?, track_batches=?, updated_at=datetime('now')
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
    track_batches,
    id,
  );
  const streamKey = (formData.get("stream_key") as string)?.trim().toLowerCase();
  await db.prepare("DELETE FROM fb_keywords WHERE product_id = ?").run(id);
  if (streamKey) {
    const streamQty = parseInt(formData.get("stream_qty") as string) || 1;
    try {
      await db.prepare("INSERT INTO fb_keywords (keyword, product_id, quantity) VALUES (?, ?, ?)").run(streamKey, id, streamQty);
    } catch {
      // keyword already exists, skip
    }
  }
  revalidatePath("/products");
  revalidatePath("/livestream");
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
  const locationId = formData.get("location_id") ? parseInt(formData.get("location_id") as string) : null;
  const batchId = formData.get("batch_id") ? parseInt(formData.get("batch_id") as string) : null;
  const variantId = formData.get("variant_id") ? parseInt(formData.get("variant_id") as string) : null;

  const product = await db.prepare("SELECT * FROM products WHERE id = ?").get(productId) as { quantity: number } | undefined;
  if (!product) throw new Error("Product not found");

  const newQty = type === "IN" ? product.quantity + quantity : product.quantity - quantity;
  if (newQty < 0) throw new Error("Insufficient stock");

  const insertMovement = db.prepare("INSERT INTO stock_movements (product_id, type, quantity, unit_cost, case_cost, case_quantity, note, created_at, location_id, batch_id, variant_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const updateProduct = db.prepare("UPDATE products SET quantity = ?, updated_at = datetime('now') WHERE id = ?");

  await db.transaction(async () => {
    const ts = date ? `${date} ${new Date().toTimeString().slice(0, 8)}` : undefined;
    await insertMovement.run(productId, type, quantity, unitCost, caseCost, caseQuantity, note, ts || null, locationId, batchId, variantId);
    await updateProduct.run(newQty, productId);

    // If IN with batch+location, also update batch quantity
    if (type === "IN" && batchId) {
      await db.prepare("UPDATE batches SET quantity = quantity + ?, updated_at = datetime('now') WHERE id = ?").run(quantity, batchId);
    }
    if (type === "OUT" && batchId) {
      await db.prepare("UPDATE batches SET quantity = MAX(0, quantity - ?), updated_at = datetime('now') WHERE id = ?").run(quantity, batchId);
    }
  })();

  revalidatePath("/stock");
  revalidatePath("/");
  redirect("/stock");
}

export async function processPOS(formData: FormData) {
  const itemsJson = formData.get("items") as string;
  if (!itemsJson) return { error: "No items provided" };
  let items: Array<{ productId: number; quantity: number; price: number; discount?: number; discountType?: string; promotionId?: number; variantId?: number; batchId?: number; locationId?: number }>;
  try {
    items = JSON.parse(itemsJson);
  } catch {
    return { error: "Invalid items data" };
  }
  if (items.length === 0) return { error: "Cart is empty" };
  const customerId = formData.get("customer_id") ? parseInt(formData.get("customer_id") as string) : null;
  const customerType = formData.get("customer_type") as string || null;
  const paymentMethod = formData.get("payment_method") as string || "cash";
  const discountTotal = parseFloat(formData.get("discount_total") as string) || 0;
  const discountType = formData.get("discount_type") as string || null;

  const getProduct = db.prepare("SELECT id, name, sku, quantity, price, has_variants, track_batches FROM products WHERE id = ?");
  const getVariant = db.prepare("SELECT id, product_id, quantity FROM product_variants WHERE id = ?");
  const getBatch = db.prepare("SELECT id, product_id, quantity FROM batches WHERE id = ?");
  const insertMovement = db.prepare("INSERT INTO stock_movements (product_id, type, quantity, note, variant_id, batch_id, location_id) VALUES (?, 'OUT', ?, ?, ?, ?, ?)");
  const updateStock = db.prepare("UPDATE products SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ?");

  const sale = db.transaction(async () => {
    let subtotal = 0;
    let itemCount = 0;
    const saleItems: Array<{
      product_id: number; product_name: string; sku: string;
      price: number; quantity: number;
      discount?: number; discount_type?: string; promotion_id?: number;
      variant_id?: number; batch_id?: number; location_id?: number;
    }> = [];

    for (const item of items) {
      const product = await getProduct.get(item.productId) as { id: number; name: string; sku: string; quantity: number; price: number; has_variants: number; track_batches: number } | undefined;
      if (!product) throw new Error(`Product ${item.productId} not found`);

      // Check and deduct from variant stock if specified
      if (item.variantId) {
        const variant = await getVariant.get(item.variantId) as { id: number; product_id: number; quantity: number } | undefined;
        if (!variant) throw new Error(`Variant ${item.variantId} not found`);
        if (variant.quantity < item.quantity) throw new Error(`Insufficient stock for variant ${item.variantId}`);
        await db.prepare("UPDATE product_variants SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ?").run(item.quantity, item.variantId);
      } else {
        if (product.quantity < item.quantity) throw new Error(`Insufficient stock for product ${item.productId}`);
      }

      // Check and deduct from batch stock if specified
      if (item.batchId) {
        const batch = await getBatch.get(item.batchId) as { id: number; product_id: number; quantity: number } | undefined;
        if (!batch) throw new Error(`Batch ${item.batchId} not found`);
        if (batch.quantity < item.quantity) throw new Error(`Insufficient stock for batch ${item.batchId}`);
        await db.prepare("UPDATE batches SET quantity = MAX(0, quantity - ?), updated_at = datetime('now') WHERE id = ?").run(item.quantity, item.batchId);
      } else if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for product ${item.productId}`);
      }

      await insertMovement.run(item.productId, item.quantity, "POS sale", item.variantId || null, item.batchId || null, item.locationId || null);
      await updateStock.run(item.quantity, item.productId);
      subtotal += item.price * item.quantity;
      itemCount += item.quantity;
      saleItems.push({
        product_id: item.productId, product_name: product.name, sku: product.sku,
        price: item.price, quantity: item.quantity,
        discount: item.discount, discount_type: item.discountType, promotion_id: item.promotionId,
        variant_id: item.variantId, batch_id: item.batchId, location_id: item.locationId,
      });
    }

    const total = subtotal - discountTotal;

    const saleResult = await db.prepare(
      "INSERT INTO sales (customer_id, total, item_count, customer_type, payment_method, discount, discount_type) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(customerId, total, itemCount, customerType, paymentMethod, discountTotal, discountType);
    const saleId = saleResult.lastInsertRowid as number;

    const insertItem = db.prepare(
      "INSERT INTO sale_items (sale_id, product_id, product_name, sku, price, quantity, discount, discount_type, promotion_id, variant_id, batch_id, location_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    for (const si of saleItems) {
      await insertItem.run(saleId, si.product_id, si.product_name, si.sku, si.price, si.quantity,
        si.discount || null, si.discount_type || null, si.promotion_id || null,
        si.variant_id || null, si.batch_id || null, si.location_id || null);
    }

    // Save receipt data
    const receiptData = JSON.stringify({
      items: saleItems.map(si => ({ name: si.product_name, sku: si.sku, price: si.price, qty: si.quantity })),
      subtotal, discount: discountTotal, discountType, total, paymentMethod,
      customerId, customerType,
    });
    await db.prepare("INSERT INTO receipts (receipt_data, total, item_count) VALUES (?, ?, ?)")
      .run(receiptData, total, itemCount);

    return { saleId, total, itemCount, subtotal, discount: discountTotal };
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
  await requirePermission("audit.manage");
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
  await requirePermission("audit.manage");
  const name = formData.get("name") as string;
  if (!name) throw new Error("Name required");

  const result = await db.prepare("INSERT INTO physical_audits (name) VALUES (?)").run(name);
  const auditId = result.lastInsertRowid as number;

  const products = await db.prepare("SELECT id, name, has_variants FROM products ORDER BY name ASC").all() as { id: number; name: string; has_variants: number }[];
  const insertItem = db.prepare("INSERT INTO physical_audit_items (audit_id, product_id, variant_id, expected_qty) VALUES (?, ?, ?, ?)");
  const getVariants = db.prepare("SELECT id FROM product_variants WHERE product_id = ?");

  for (const product of products) {
    if (product.has_variants) {
      const variants = await getVariants.all(product.id) as { id: number }[];
      if (variants.length > 0) {
        for (const v of variants) {
          await insertItem.run(auditId, product.id, v.id, 0);
        }
        continue;
      }
    }
    const qty = await db.prepare("SELECT quantity FROM products WHERE id = ?").get(product.id) as { quantity: number } | undefined;
    await insertItem.run(auditId, product.id, null, qty?.quantity || 0);
  }

  revalidatePath("/audit");
  redirect(`/audit/${auditId}`);
}

export async function updateAuditItem(formData: FormData) {
  await requirePermission("audit.manage");
  const itemId = parseInt(formData.get("item_id") as string);
  const actualQty = parseInt(formData.get("actual_qty") as string);
  if (isNaN(itemId) || isNaN(actualQty) || actualQty < 0) throw new Error("Invalid values");

  const item = await db.prepare("SELECT expected_qty FROM physical_audit_items WHERE id = ?").get(itemId) as { expected_qty: number } | undefined;
  if (!item) throw new Error("Item not found");

  const difference = actualQty - item.expected_qty;
  const note = formData.get("note") as string || null;
  await db.prepare("UPDATE physical_audit_items SET actual_qty = ?, difference = ?, note = ? WHERE id = ?")
    .run(actualQty, difference, note, itemId);
  revalidatePath("/audit");
}

export async function completeAudit(formData: FormData) {
  await requirePermission("audit.manage");
  const auditId = parseInt(formData.get("audit_id") as string);
  if (isNaN(auditId)) throw new Error("Invalid audit ID");

  const uncounted = await db.prepare("SELECT COUNT(*) as c FROM physical_audit_items WHERE audit_id = ? AND actual_qty IS NULL").get(auditId) as { c: number };
  if (uncounted.c > 0) throw new Error("All items must be counted before completing");

  await db.prepare("UPDATE physical_audits SET status = 'completed', completed_at = datetime('now') WHERE id = ?").run(auditId);
  revalidatePath("/audit");
  redirect("/audit");
}

export async function applyAuditCorrections(formData: FormData) {
  await requirePermission("audit.manage");
  const auditId = parseInt(formData.get("audit_id") as string);
  if (isNaN(auditId)) throw new Error("Invalid audit ID");

  const items = await db.prepare(`
    SELECT ai.id, ai.product_id, ai.variant_id, ai.expected_qty, ai.actual_qty, ai.difference,
      p.name as product_name
    FROM physical_audit_items ai
    JOIN products p ON p.id = ai.product_id
    WHERE ai.audit_id = ? AND ai.actual_qty IS NOT NULL AND ai.difference != 0
  `).all(auditId) as any[];

  const updateProduct = db.prepare("UPDATE products SET quantity = ?, updated_at = datetime('now') WHERE id = ?");
  const updateVariant = db.prepare("UPDATE product_variants SET quantity = ?, updated_at = datetime('now') WHERE id = ?");
  const insertMovement = db.prepare("INSERT INTO stock_movements (product_id, type, quantity, note) VALUES (?, ?, ?, ?)");

  for (const item of items) {
    const diff = item.actual_qty - item.expected_qty;
    const type = diff > 0 ? "IN" : "OUT";
    await updateProduct.run(item.actual_qty, item.product_id);
    await insertMovement.run(item.product_id, type, Math.abs(diff), `Stock count correction (audit #${auditId})`);
    if (item.variant_id) {
      const v = await db.prepare("SELECT quantity FROM product_variants WHERE id = ?").get(item.variant_id) as { quantity: number } | undefined;
      if (v) {
        const newVariantQty = Math.max(0, v.quantity + diff);
        await updateVariant.run(newVariantQty, item.variant_id);
      }
    }
  }

  revalidatePath("/audit");
  redirect(`/audit/${auditId}`);
}

export async function cancelAudit(formData: FormData) {
  await requirePermission("audit.manage");
  const auditId = parseInt(formData.get("audit_id") as string);
  if (isNaN(auditId)) throw new Error("Invalid audit ID");
  await db.prepare("UPDATE physical_audits SET status = 'cancelled' WHERE id = ?").run(auditId);
  revalidatePath("/audit");
  redirect("/audit");
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

// === LOCATIONS ===
export async function createLocation(formData: FormData) {
  const name = formData.get("name") as string;
  const address = formData.get("address") as string || null;
  if (!name) throw new Error("Name required");
  if (formData.get("is_default")) {
    await db.prepare("UPDATE locations SET is_default = 0").run();
  }
  await db.prepare("INSERT INTO locations (name, address, is_default) VALUES (?, ?, ?)")
    .run(name, address, formData.get("is_default") ? 1 : 0);
  revalidatePath("/stock");
  redirect("/stock");
}

export async function updateLocation(id: number, formData: FormData) {
  const name = formData.get("name") as string;
  const address = formData.get("address") as string || null;
  if (!name) throw new Error("Name required");
  if (formData.get("is_default")) {
    await db.prepare("UPDATE locations SET is_default = 0").run();
  }
  await db.prepare("UPDATE locations SET name=?, address=?, is_default=?, updated_at=datetime('now') WHERE id=?")
    .run(name, address, formData.get("is_default") ? 1 : 0, id);
  revalidatePath("/stock");
}

export async function deleteLocation(id: number) {
  await db.prepare("DELETE FROM locations WHERE id = ?").run(id);
  revalidatePath("/stock");
}

// === PRODUCT VARIANTS ===
export async function createVariant(formData: FormData) {
  const product_id = parseInt(formData.get("product_id") as string);
  const name = formData.get("name") as string;
  const sku = formData.get("sku") as string || null;
  const barcode = formData.get("barcode") as string || null;
  const price = formData.get("price") ? parseFloat(formData.get("price") as string) : null;
  if (!product_id || !name) throw new Error("Missing fields");
  await db.prepare("INSERT INTO product_variants (product_id, name, sku, barcode, price) VALUES (?, ?, ?, ?, ?)")
    .run(product_id, name, sku, barcode, price);
  await db.prepare("UPDATE products SET has_variants = 1, updated_at = datetime('now') WHERE id = ?").run(product_id);
  revalidatePath("/products");
  revalidatePath("/stock");
}

export async function updateVariant(id: number, formData: FormData) {
  const name = formData.get("name") as string;
  const sku = formData.get("sku") as string || null;
  const barcode = formData.get("barcode") as string || null;
  const price = formData.get("price") ? parseFloat(formData.get("price") as string) : null;
  if (!name) throw new Error("Name required");
  await db.prepare("UPDATE product_variants SET name=?, sku=?, barcode=?, price=?, updated_at=datetime('now') WHERE id=?")
    .run(name, sku, barcode, price, id);
  revalidatePath("/products");
  revalidatePath("/stock");
}

export async function deleteVariant(id: number) {
  const v = await db.prepare("SELECT product_id FROM product_variants WHERE id = ?").get(id) as { product_id: number } | undefined;
  await db.prepare("DELETE FROM product_variants WHERE id = ?").run(id);
  if (v) {
    const remaining = await db.prepare("SELECT COUNT(*) as c FROM product_variants WHERE product_id = ?").get(v.product_id) as { c: number };
    if (remaining.c === 0) {
      await db.prepare("UPDATE products SET has_variants = 0, updated_at = datetime('now') WHERE id = ?").run(v.product_id);
    }
  }
  revalidatePath("/products");
  revalidatePath("/stock");
}

// === BATCHES ===
export async function createBatch(formData: FormData) {
  const product_id = parseInt(formData.get("product_id") as string);
  const variant_id = formData.get("variant_id") ? parseInt(formData.get("variant_id") as string) : null;
  const batch_no = formData.get("batch_no") as string;
  const location_id = formData.get("location_id") ? parseInt(formData.get("location_id") as string) : null;
  const quantity = parseInt(formData.get("quantity") as string) || 0;
  const expiry_date = formData.get("expiry_date") as string || null;
  const cost_price = formData.get("cost_price") ? parseFloat(formData.get("cost_price") as string) : null;
  if (!product_id || !batch_no) throw new Error("Missing fields");
  await db.prepare("INSERT INTO batches (product_id, variant_id, batch_no, location_id, quantity, expiry_date, cost_price) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(product_id, variant_id, batch_no, location_id, quantity, expiry_date, cost_price);
  await db.prepare("UPDATE products SET track_batches = 1, updated_at = datetime('now') WHERE id = ?").run(product_id);
  revalidatePath("/stock");
  redirect("/stock");
}

export async function deleteBatch(id: number) {
  await db.prepare("DELETE FROM batches WHERE id = ?").run(id);
  revalidatePath("/stock");
}

// === NOTIFICATIONS ===
export async function generateStockNotifications() {
  await generateStockNotificationsData();
  revalidatePath("/notifications");
}

export async function getNotifications() {
  return getNotificationsData();
}

export async function getUnreadNotificationCount() {
  return getUnreadNotificationCountData();
}

export async function markNotificationRead(id: number) {
  await markNotificationReadData(id);
  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  await markAllNotificationsReadData();
  revalidatePath("/notifications");
}

export async function clearAllNotifications() {
  await clearAllNotificationsData();
  revalidatePath("/notifications");
}

// === ADMIN: CLEAR ALL DATA ===
const dataCategories: Record<string, string[]> = {
  products: ["products", "product_variants", "customer_group_prices", "customer_groups"],
  stock: ["stock_movements", "batches", "locations"],
  sales: ["sale_items", "sales", "receipts", "customer_order_items", "customer_orders"],
  customers_suppliers: ["customers", "suppliers"],
  deliveries: ["deliveries", "delivery_partners"],
  debts: ["debt_payments", "debts"],
  cashflow: ["cash_flow"],
  promotions: ["promotions"],
  members: ["membership_tiers", "members"],
  audits: ["physical_audit_items", "physical_audits"],
  notifications: ["notifications"],
};

export async function clearAllData(categories?: string[]) {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") throw new Error("Unauthorized");

  const tables = categories
    ? categories.flatMap((c) => dataCategories[c] || [])
    : Object.values(dataCategories).flat();

  if (tables.length === 0) return;

  for (const table of tables) {
    try {
      await db.prepare(`DELETE FROM ${table}`).run();
    } catch { /* table may not exist on older schemas */ }
  }

  revalidatePath("/");
}

// === LIVESTREAM ===
export async function createKeyword(formData: FormData) {
  await requirePermission("livestream.manage");
  const keyword = (formData.get("keyword") as string)?.trim().toLowerCase();
  const productId = parseInt(formData.get("productId") as string);
  const quantity = parseInt(formData.get("quantity") as string) || 1;
  if (!keyword || !productId) return { error: "Keyword and product are required" };

  const product = await db.prepare("SELECT id, name, selling_price, price FROM products WHERE id = ?").get(productId) as any;
  if (!product) return { error: "Product not found" };

  try {
    await db.prepare("INSERT INTO fb_keywords (keyword, product_id, quantity) VALUES (?, ?, ?)").run(keyword, productId, quantity);
  } catch {
    return { error: "Keyword already exists" };
  }
  revalidatePath("/livestream");
}

export async function deleteKeyword(id: number) {
  await requirePermission("livestream.manage");
  await db.prepare("DELETE FROM fb_keywords WHERE id = ?").run(id);
  revalidatePath("/livestream");
}

export async function simulateOrder(formData: FormData) {
  await requirePermission("livestream.manage");
  const keyword = (formData.get("keyword") as string)?.trim().toLowerCase();
  const customerName = (formData.get("customerName") as string)?.trim() || "Facebook User";
  if (!keyword) return { error: "Keyword is required" };

  const mapping = await db.prepare(`
    SELECT fk.*, p.name as product_name, p.selling_price, p.price
    FROM fb_keywords fk JOIN products p ON fk.product_id = p.id
    WHERE fk.keyword = ?
  `).get(keyword) as any;
  if (!mapping) return { error: `No product mapped to keyword "${keyword}"` };

  const price = mapping.selling_price || mapping.price;
  const total = price * mapping.quantity;

  const product = await db.prepare("SELECT quantity FROM products WHERE id = ?").get(mapping.product_id) as { quantity: number } | undefined;
  if (!product || product.quantity < mapping.quantity) return { error: "Insufficient stock" };

  await db.prepare("UPDATE products SET quantity = quantity - ? WHERE id = ?").run(mapping.quantity, mapping.product_id);
  await db.prepare(`
    INSERT INTO fb_orders (keyword, customer_name, product_id, product_name, quantity, total)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(keyword, customerName, mapping.product_id, mapping.product_name, mapping.quantity, total);

  revalidatePath("/livestream");
  return { success: true, product_name: mapping.product_name, quantity: mapping.quantity, total };
}

export async function processOrder(formData: FormData) {
  await requirePermission("livestream.manage");
  const id = parseInt(formData.get("id") as string);
  if (!id || isNaN(id)) return { error: "Invalid order ID" };
  await db.prepare("UPDATE fb_orders SET processed = 1 WHERE id = ? AND processed = 0").run(id);
  revalidatePath("/livestream");
}

export async function clearOrders() {
  await requirePermission("livestream.manage");
  await db.prepare("DELETE FROM fb_orders").run();
  revalidatePath("/livestream");
}

export async function saveStreamUrl(url: string) {
  await requirePermission("livestream.manage");
  const existing = await db.prepare("SELECT key FROM settings WHERE key = 'livestream_url'").get();
  if (existing) {
    await db.prepare("UPDATE settings SET value = ? WHERE key = 'livestream_url'").run(url);
  } else {
    await db.prepare("INSERT INTO settings (key, value) VALUES ('livestream_url', ?)").run(url);
  }
  revalidatePath("/livestream");
}

export async function saveFacebookPage(formData: FormData) {
  await requirePermission("livestream.manage");
  const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  const fields = ["facebook_page_url", "facebook_page_name", "facebook_page_id", "facebook_business_id", "facebook_access_token", "facebook_app_id", "facebook_app_secret"];
  for (const key of fields) {
    const val = formData.get(key) as string;
    if (val !== null) await upsert.run(key, val.trim());
  }
  revalidatePath("/livestream");
}

export async function clearFacebookPage() {
  await requirePermission("livestream.manage");
  await db.prepare("DELETE FROM settings WHERE key LIKE 'facebook_%'").run();
  revalidatePath("/livestream");
}

// === LIVESTREAM DASHBOARD ===
export async function createLivestream(formData: FormData) {
  await requirePermission("livestream.manage");
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const facebookPageId = formData.get("facebook_page_id") as string;
  const scheduledAt = formData.get("scheduled_at") as string;
  if (!title?.trim()) return { error: "Title is required" };
  await db.prepare(`
    INSERT INTO livestreams (title, description, facebook_page_id, status, scheduled_at)
    VALUES (?, ?, ?, 'draft', ?)
  `).run(title.trim(), description?.trim() || null, facebookPageId?.trim() || null, scheduledAt || null);
  revalidatePath("/livestream");
}

export async function startLivestream(id: number) {
  await requirePermission("livestream.manage");
  await db.prepare("UPDATE livestreams SET status = 'live', started_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(id);
  revalidatePath("/livestream");
}

export async function endLivestream(id: number) {
  await requirePermission("livestream.manage");
  await db.prepare("UPDATE livestreams SET status = 'ended', ended_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(id);
  revalidatePath("/livestream");
}

export async function deleteLivestream(id: number) {
  await requirePermission("livestream.manage");
  await db.prepare("DELETE FROM livestreams WHERE id = ?").run(id);
  revalidatePath("/livestream");
}

export async function addLiveProduct(formData: FormData) {
  await requirePermission("livestream.manage");
  const livestreamId = parseInt(formData.get("livestream_id") as string);
  const productId = parseInt(formData.get("product_id") as string);
  const keyword = (formData.get("keyword") as string)?.trim().toUpperCase();
  const priceOverride = formData.get("price_override") ? parseFloat(formData.get("price_override") as string) || null : null;
  const maxQty = formData.get("max_quantity") ? parseInt(formData.get("max_quantity") as string) || null : null;
  const priority = parseInt(formData.get("priority") as string) || 0;
  const reserveStock = parseInt(formData.get("reserve_stock") as string) || 0;
  if (!livestreamId || !productId || !keyword) return { error: "Missing required fields" };
  try {
    await db.prepare(`
      INSERT INTO live_products (livestream_id, product_id, keyword, price_override, max_quantity, priority, reserve_stock)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(livestreamId, productId, keyword, priceOverride, maxQty, priority, reserveStock);
  } catch {
    return { error: "Duplicate keyword or invalid data" };
  }
  revalidatePath("/livestream");
}

export async function deleteLiveProduct(id: number) {
  await requirePermission("livestream.manage");
  await db.prepare("DELETE FROM live_products WHERE id = ?").run(id);
  revalidatePath("/livestream");
}

export async function createOrderFromComment(formData: FormData) {
  await requirePermission("livestream.manage");
  const commentId = parseInt(formData.get("comment_id") as string);
  const customerName = formData.get("customer_name") as string;
  const customerPhone = formData.get("customer_phone") as string;
  const customerAddress = formData.get("customer_address") as string;

  const comment = await db.prepare("SELECT * FROM live_comments WHERE id = ?").get(commentId) as any;
  if (!comment) return { error: "Comment not found" };
  if (comment.status === "ordered") return { error: "Order already created for this comment" };
  if (!comment.matched_product_id) return { error: "No product matched" };

  const product = await db.prepare("SELECT id, name, selling_price, price, quantity FROM products WHERE id = ?").get(comment.matched_product_id) as any;
  if (!product) return { error: "Product not found" };

  const price = product.selling_price || product.price;
  const total = price * comment.detected_quantity;
  const orderNumber = `LV-${Date.now()}`;

  const orderResult = await db.prepare(`
    INSERT INTO live_orders (livestream_id, order_number, customer_name, customer_phone, customer_address, facebook_comment_id, total, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'processing')
  `).run(comment.livestream_id, orderNumber, customerName || comment.customer_name, customerPhone || null, customerAddress || null, comment.facebook_comment_id, total);

  const orderId = Number(orderResult.lastInsertRowid);

  await db.prepare(`
    INSERT INTO live_order_items (order_id, product_id, product_name, quantity, price, total)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(orderId, product.id, product.name, comment.detected_quantity, price, total);

  await db.prepare("UPDATE live_comments SET status = 'ordered' WHERE id = ?").run(commentId);
  await db.prepare("UPDATE livestreams SET order_count = order_count + 1, revenue = revenue + ? WHERE id = ?").run(total, comment.livestream_id);

  // Send Telegram notification
  try {
    const { sendOrderNotification } = await import("@/lib/livestream-telegram");
    await sendOrderNotification({
      order_number: orderNumber,
      customer_name: customerName || comment.customer_name,
      items: [{ product_name: product.name, quantity: comment.detected_quantity }],
      total,
      status: "processing",
    });
  } catch {}

  revalidatePath("/livestream");
  return { success: true, order_id: orderId, order_number: orderNumber };
}

export async function updateOrderStatus(formData: FormData) {
  await requirePermission("livestream.manage");
  const id = parseInt(formData.get("id") as string);
  const status = formData.get("status") as string;
  const driverId = formData.get("driver_id") ? parseInt(formData.get("driver_id") as string) : null;
  if (!id || !status) return { error: "Missing required fields" };

  await db.prepare("UPDATE live_orders SET status = ?, driver_id = ?, updated_at = datetime('now') WHERE id = ?").run(status, driverId, id);

  if (status === "cancelled") {
    const items = await db.prepare("SELECT * FROM live_order_items WHERE order_id = ?").all(id) as any[];
    for (const item of items) {
      await db.prepare("UPDATE products SET quantity = quantity + ? WHERE id = ?").run(item.quantity, item.product_id);
    }
  }

  revalidatePath("/livestream");
}

export async function ignoreComment(id: number) {
  await requirePermission("livestream.manage");
  await db.prepare("UPDATE live_comments SET status = 'ignored' WHERE id = ?").run(id);
  revalidatePath("/livestream");
}

export async function blockCustomer(customerId: string) {
  await requirePermission("livestream.manage");
  await db.prepare("UPDATE live_comments SET status = 'blocked' WHERE customer_id = ? AND status = 'pending'").run(customerId);
  revalidatePath("/livestream");
}

export async function updateViewerCount(formData: FormData) {
  await requirePermission("livestream.manage");
  const livestreamId = parseInt(formData.get("livestream_id") as string);
  const count = parseInt(formData.get("count") as string);
  if (!livestreamId || isNaN(count)) return;
  await db.prepare("UPDATE livestreams SET viewer_count = ? WHERE id = ?").run(count, livestreamId);
  revalidatePath("/livestream");
}

export async function getDrivers() {
  const drivers = await db.prepare("SELECT id, name FROM users WHERE role = 'driver' OR role = 'admin' ORDER BY name ASC").all() as { id: number; name: string }[];
  return drivers;
}
