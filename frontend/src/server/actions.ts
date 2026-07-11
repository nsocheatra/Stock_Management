"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import net from "net";
import { db } from "./db";
import { requireAuth, requirePermission } from "./auth";
import { getSecret, isSecretKey } from "./secrets";
import {
  generateStockNotificationsData,
  getNotifications as getNotificationsData,
  getUnreadNotificationCount as getUnreadNotificationCountData,
  markNotificationRead as markNotificationReadData,
  markAllNotificationsRead as markAllNotificationsReadData,
  clearAllNotifications as clearAllNotificationsData,
} from "./notifications-data";

export async function createProduct(formData: FormData) {
  await requirePermission("products.manage");
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
  revalidatePath("/products");
  redirect("/products");
}

export async function updateProduct(id: number, formData: FormData) {
  await requirePermission("products.manage");
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
  revalidatePath("/products");
  redirect("/products");
}

export async function deleteProduct(id: number) {
  await requirePermission("products.manage");
  await db.prepare("DELETE FROM stock_movements WHERE product_id = ?").run(id);
  await db.prepare("DELETE FROM products WHERE id = ?").run(id);
  revalidatePath("/products");
  redirect("/products");
}

export async function createStockMovement(formData: FormData) {
  await requirePermission("stock.manage");
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
  await requirePermission("pos.access");
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

      if (item.variantId) {
        const variant = await getVariant.get(item.variantId) as { id: number; product_id: number; quantity: number } | undefined;
        if (!variant) throw new Error(`Variant ${item.variantId} not found`);
        if (variant.quantity < item.quantity) throw new Error(`Insufficient stock for variant ${item.variantId}`);
        await db.prepare("UPDATE product_variants SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ?").run(item.quantity, item.variantId);
      } else {
        if (product.quantity < item.quantity) throw new Error(`Insufficient stock for product ${item.productId}`);
      }

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
    console.error("processPOS error:", (e as Error).message);
    return { error: "Failed to process sale" };
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
  await requireAuth();
  const rows = await db.prepare("SELECT key, value FROM settings").all() as Array<{ key: string; value: string }>;
  const s: Record<string, string> = {};
  for (const row of rows) {
    if (!isSecretKey(row.key)) s[row.key] = row.value;
  }
  return s;
}

export async function saveSettings(formData: FormData) {
  await requirePermission("settings.manage");
  const keys = [
    "printer_type", "paper_width", "receipt_header", "receipt_footer",
    "receipt_copies", "auto_print", "store_name", "store_address", "store_phone",
    "printer_ip", "printer_port",
    "telegram_notify_low_stock",
    "telegram_notify_daily",
    "payment_default_method", "payment_methods_enabled",
    "tax_rate", "tax_label",
    ];
  const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
  for (const key of keys) {
    const val = formData.get(key);
    if (val !== null) await upsert.run(key, String(val));
  }
  return { success: true };
}

// ─── Printing ────────────────────────────────────────────────
function escposText(text: string, encoding: BufferEncoding = "ascii"): Buffer {
  const lines = text.split("\n");
  const parts: Buffer[] = [];
  for (const line of lines) {
    parts.push(Buffer.from(line + "\n", encoding));
  }
  return Buffer.concat(parts);
}

function generateESCPOS(receipt: {
  storeName: string; storeAddress?: string; storePhone?: string;
  header?: string; footer?: string;
  items: Array<{ name: string; qty: number; price: number; lineTotal: number }>;
  discountAmount?: number; tax?: number; taxLabel?: string;
  total: number; paymentMethod?: string;
  paperWidth: number; copies: number;
}): Buffer {
  const pw = String(receipt.paperWidth);
  const cols = pw === "58" ? 32 : pw === "76" ? 42 : 48;
  const enc: BufferEncoding = "ascii";
  const bold = (n: number) => Buffer.from([0x1B, 0x21, n]);
  const align = (a: number) => Buffer.from([0x1B, 0x61, a]);
  const feed = (n: number) => Buffer.from([0x1B, 0x64, n]);
  const cut = () => Buffer.from([0x1D, 0x56, 0x00]);
  const init = () => Buffer.from([0x1B, 0x40]);
  const underline = (n: number) => Buffer.from([0x1B, 0x2D, n]);
  const separator = "─".repeat(cols);

  const chunks: Buffer[] = [init()];

  chunks.push(align(1), bold(0x10));
  chunks.push(escposText(receipt.storeName.substring(0, cols), enc));
  chunks.push(bold(0x00), align(0));

  if (receipt.storeAddress) {
    chunks.push(align(1), escposText(receipt.storeAddress.substring(0, cols), enc), align(0));
  }
  if (receipt.storePhone) {
    chunks.push(align(1), escposText(`Tel: ${receipt.storePhone}`, enc), align(0));
  }
  chunks.push(align(1), escposText(new Date().toLocaleString(), enc), align(0));
  chunks.push(escposText("\n" + separator + "\n", enc));

  if (receipt.header) {
    chunks.push(align(1), escposText(receipt.header, enc), align(0));
    chunks.push(escposText(separator + "\n", enc));
  }

  const qtyW = 4;
  const priceW = 8;
  const totalW = 8;
  const nameW = cols - qtyW - priceW - totalW - 2;
  const hdr = "Item".padEnd(nameW, " ") + " " + "Qty".padStart(qtyW - 1, " ") + " " + "Price".padStart(priceW - 1, " ") + " " + "Total".padStart(totalW - 1, " ");
  chunks.push(underline(1), escposText(hdr + "\n", enc), underline(0));

  for (const item of receipt.items) {
    const name = item.name.substring(0, nameW).padEnd(nameW, " ");
    const qty = String(item.qty).padStart(qtyW, " ");
    const price = `$${item.price.toFixed(2)}`.padStart(priceW, " ");
    const lineTotal = `$${item.lineTotal.toFixed(2)}`.padStart(totalW, " ");
    chunks.push(escposText(`${name} ${qty} ${price} ${lineTotal}\n`, enc));
  }

  chunks.push(escposText(separator + "\n", enc));

  if (receipt.discountAmount) {
    chunks.push(escposText(`Discount: -$${receipt.discountAmount.toFixed(2)}\n`.padStart(cols), enc));
  }
  if (receipt.tax != null && receipt.tax > 0) {
    chunks.push(escposText(`${receipt.taxLabel || "Tax"}: $${receipt.tax.toFixed(2)}\n`.padStart(cols), enc));
  }

  chunks.push(bold(0x08));
  chunks.push(escposText(`TOTAL: $${receipt.total.toFixed(2)}\n`.padStart(cols), enc));
  chunks.push(bold(0x00));

  if (receipt.paymentMethod) {
    chunks.push(escposText(`Payment: ${receipt.paymentMethod}\n`.padStart(cols), enc));
  }

  chunks.push(escposText("\n", enc));
  if (receipt.footer) {
    chunks.push(align(1), escposText(receipt.footer, enc), align(0));
  }
  chunks.push(align(1), escposText("Thank you!\n", enc), align(0));

  chunks.push(feed(5), cut());

  return Buffer.concat(chunks);
}

export async function printReceipt(data: {
  items: Array<{ name: string; qty: number; price: number }>;
  total: number;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  header?: string;
  footer?: string;
  discountAmount?: number;
  tax?: number;
  taxLabel?: string;
  paymentMethod?: string;
  printerType: string;
  printerIp?: string;
  printerPort?: number;
  paperWidth: number;
  copies: number;
}) {
  await requireAuth();
  if (data.printerType === "browser") {
    return { success: true, method: "browser" };
  }

  const ip = data.printerIp || "";
  const port = data.printerPort || 9100;
  if (!ip) {
    return { success: false, error: "Printer IP not configured" };
  }

  const items = data.items.map((i) => ({
    name: i.name,
    qty: i.qty,
    price: i.price,
    lineTotal: i.price * i.qty,
  }));

  const escpos = generateESCPOS({
    storeName: data.storeName,
    storeAddress: data.storeAddress,
    storePhone: data.storePhone,
    header: data.header,
    footer: data.footer,
    items,
    discountAmount: data.discountAmount,
    tax: data.tax,
    taxLabel: data.taxLabel,
    total: data.total,
    paymentMethod: data.paymentMethod,
    paperWidth: data.paperWidth,
    copies: data.copies,
  });

  for (let i = 0; i < data.copies; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = new net.Socket();
        socket.connect(port, ip, () => {
          socket.write(escpos, (err) => {
            if (err) { socket.destroy(); reject(err); return; }
            socket.destroy();
            resolve();
          });
        });
        socket.on("error", reject);
        socket.setTimeout(10000, () => { socket.destroy(); reject(new Error("Socket timeout")); });
      });
    } catch (err) {
      return { success: false, error: `Failed to print copy ${i + 1}: ${err}` };
    }
  }

  return { success: true, method: "network" };
}

// ─── Receipts ────────────────────────────────────────────────
export async function saveReceipt(formData: FormData) {
  await requireAuth();
  const data = formData.get("data") as string;
  const total = parseFloat(formData.get("total") as string);
  const count = parseInt(formData.get("count") as string);
  const parsed = JSON.parse(data);
  await db.prepare("INSERT INTO receipts (receipt_data, total, item_count) VALUES (?, ?, ?)").run(JSON.stringify(parsed), total, count);
  return { success: true };
}

export async function getReceipts(limit = 50) {
  await requireAuth();
  return await db.prepare("SELECT * FROM receipts ORDER BY created_at DESC LIMIT ?").all(limit);
}

// ─── Telegram ────────────────────────────────────────────────
export async function sendTelegramNotification(message: string) {
  await requireAuth();
  const token = await getSecret("telegram_bot_token");
  const chatIdsRaw = await getSecret("telegram_chat_ids");
  const enabled = (await getSecret("telegram_enabled")) === "1";
  if (!token || !chatIdsRaw || !enabled) return;
  const chatIds = chatIdsRaw.split(",").map((s: string) => s.trim()).filter(Boolean);
  if (chatIds.length === 0) return;

  for (const chatId of chatIds) {
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
  await requirePermission("suppliers.manage");
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
  await requirePermission("suppliers.manage");
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
  await requirePermission("suppliers.manage");
  await db.prepare("UPDATE products SET supplier_id = NULL WHERE supplier_id = ?").run(id);
  await db.prepare("DELETE FROM suppliers WHERE id = ?").run(id);
  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function getCustomers() {
  await requireAuth();
  return await db.prepare("SELECT * FROM customers ORDER BY name ASC").all() as Array<{
    id: number; name: string; phone: string | null; email: string | null; address: string | null;
    customer_type: string; credit: number; created_at: string; updated_at: string;
  }>;
}

export async function getCustomer(id: number) {
  await requireAuth();
  return await db.prepare("SELECT * FROM customers WHERE id = ?").get(id) as {
    id: number; name: string; phone: string | null; email: string | null; address: string | null;
    customer_type: string; credit: number; created_at: string; updated_at: string;
  } | undefined;
}

export async function saveCustomer(formData: FormData) {
  await requirePermission("customers.manage");
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
  await requirePermission("customers.manage");
  await db.prepare("DELETE FROM customers WHERE id = ?").run(id);
  revalidatePath("/customers");
  redirect("/customers");
}

export async function getSales(limit = 100) {
  await requireAuth();
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
  await requireAuth();
  return await db.prepare("SELECT * FROM sale_items WHERE sale_id = ?").all(saleId) as Array<{
    id: number; sale_id: number; product_id: number; product_name: string;
    sku: string | null; price: number; quantity: number;
  }>;
}

// === DEBTS ===
export async function createDebt(formData: FormData) {
  await requirePermission("debts.manage");
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
  await requirePermission("debts.manage");
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
  await requirePermission("cashflow.manage");
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
  revalidatePath("/stock/count");
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
        const getVariantQty = db.prepare("SELECT quantity FROM product_variants WHERE id = ?");
        for (const v of variants) {
          const vRow = await getVariantQty.get(v.id) as { quantity: number } | undefined;
          await insertItem.run(auditId, product.id, v.id, vRow?.quantity || 0);
        }
        continue;
      }
    }
    const qty = await db.prepare("SELECT quantity FROM products WHERE id = ?").get(product.id) as { quantity: number } | undefined;
    await insertItem.run(auditId, product.id, null, qty?.quantity || 0);
  }

  revalidatePath("/stock/count");
  redirect(`/stock/count/${auditId}`);
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
  revalidatePath("/stock/count");
}

export async function completeAudit(formData: FormData) {
  await requirePermission("audit.manage");
  const auditId = parseInt(formData.get("audit_id") as string);
  if (isNaN(auditId)) throw new Error("Invalid audit ID");

  const uncounted = await db.prepare("SELECT COUNT(*) as c FROM physical_audit_items WHERE audit_id = ? AND actual_qty IS NULL").get(auditId) as { c: number };
  if (uncounted.c > 0) throw new Error("All items must be counted before completing");

  await db.prepare("UPDATE physical_audits SET status = 'completed', completed_at = datetime('now') WHERE id = ?").run(auditId);
  revalidatePath("/stock/count");
  redirect("/stock/count");
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

  const getProductQty = db.prepare("SELECT quantity FROM products WHERE id = ?");
  for (const item of items) {
    const diff = item.actual_qty - item.expected_qty;
    const type = diff > 0 ? "IN" : "OUT";
    if (item.variant_id) {
      const v = await db.prepare("SELECT quantity FROM product_variants WHERE id = ?").get(item.variant_id) as { quantity: number } | undefined;
      if (v) {
        const newVariantQty = Math.max(0, v.quantity + diff);
        await updateVariant.run(newVariantQty, item.variant_id);
      }
      const p = await getProductQty.get(item.product_id) as { quantity: number } | undefined;
      if (p) {
        const newProductQty = Math.max(0, p.quantity + diff);
        await updateProduct.run(newProductQty, item.product_id);
      }
    } else {
      await updateProduct.run(item.actual_qty, item.product_id);
    }
    await insertMovement.run(item.product_id, type, Math.abs(diff), `Stock count correction (audit #${auditId})`);
  }

  revalidatePath("/stock/count");
  redirect(`/stock/count/${auditId}`);
}

export async function cancelAudit(formData: FormData) {
  await requirePermission("audit.manage");
  const auditId = parseInt(formData.get("audit_id") as string);
  if (isNaN(auditId)) throw new Error("Invalid audit ID");
  await db.prepare("UPDATE physical_audits SET status = 'cancelled' WHERE id = ?").run(auditId);
  revalidatePath("/stock/count");
  redirect("/stock/count");
}

// === CUSTOMER ORDERS ===
export async function createCustomerOrder(formData: FormData) {
  await requirePermission("orders.manage");
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
  await requirePermission("orders.manage");
  const orderId = parseInt(formData.get("order_id") as string);
  const status = formData.get("status") as string;
  if (!orderId || !status) throw new Error("Missing fields");
  await db.prepare("UPDATE customer_orders SET status = ? WHERE id = ?").run(status, orderId);
  revalidatePath("/orders");
}

export async function convertOrderToSale(orderId: number) {
  await requirePermission("orders.manage");
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
    console.error("deliverOrder error:", (e as Error).message);
    return { error: "Failed to deliver order" };
  }

  revalidatePath("/orders");
  revalidatePath("/pos");
  return { success: true };
}

export async function getCustomerOrderReceipt(orderId: number) {
  await requireAuth();
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
  await requirePermission("delivery.manage");
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
  await requirePermission("delivery.manage");
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
  await requirePermission("promotions.manage");
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
  await requirePermission("membership.manage");
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
  await requirePermission("membership.manage");
  const customer_id = parseInt(formData.get("customer_id") as string);
  const tier_id = formData.get("tier_id") ? parseInt(formData.get("tier_id") as string) : null;
  if (!customer_id) return { error: "Customer required" };
  await db.prepare("INSERT OR IGNORE INTO members (customer_id, tier_id) VALUES (?, ?)").run(customer_id, tier_id);
  revalidatePath("/membership");
}

// === LOCATIONS ===
export async function createLocation(formData: FormData) {
  await requirePermission("stock.manage");
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
  await requirePermission("stock.manage");
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
  await requirePermission("stock.manage");
  await db.prepare("DELETE FROM locations WHERE id = ?").run(id);
  revalidatePath("/stock");
}

// === PRODUCT VARIANTS ===
export async function createVariant(formData: FormData) {
  await requirePermission("products.manage");
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
  await requirePermission("products.manage");
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
  await requirePermission("products.manage");
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
  await requirePermission("stock.manage");
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
  await requirePermission("stock.manage");
  await db.prepare("DELETE FROM batches WHERE id = ?").run(id);
  revalidatePath("/stock");
}

// === NOTIFICATIONS ===
export async function generateStockNotifications() {
  await generateStockNotificationsData();
  revalidatePath("/notifications");
}

export async function getNotifications() {
  await requireAuth();
  return getNotificationsData();
}

export async function getUnreadNotificationCount() {
  await requireAuth();
  return getUnreadNotificationCountData();
}

export async function markNotificationRead(id: number) {
  await requireAuth();
  await markNotificationReadData(id);
  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  await requireAuth();
  await markAllNotificationsReadData();
  revalidatePath("/notifications");
}

export async function clearAllNotifications() {
  await requireAuth();
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
  const { getCurrentUser } = await import("./auth");
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
