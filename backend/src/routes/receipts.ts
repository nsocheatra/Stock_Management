import { Router, Request, Response } from "express";
import net from "net";
import { db } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

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

router.post("/print", requireAuth, async (req: Request, res: Response) => {
  const data = req.body;

  if (data.printerType === "browser") {
    res.json({ success: true, method: "browser" });
    return;
  }

  const ip = data.printerIp || "";
  const port = data.printerPort || 9100;
  if (!ip) { res.status(400).json({ success: false, error: "Printer IP not configured" }); return; }

  const items = data.items.map((i: any) => ({
    name: i.name, qty: i.qty, price: i.price, lineTotal: i.price * i.qty,
  }));

  const escpos = generateESCPOS({
    storeName: data.storeName, storeAddress: data.storeAddress, storePhone: data.storePhone,
    header: data.header, footer: data.footer, items,
    discountAmount: data.discountAmount, tax: data.tax, taxLabel: data.taxLabel,
    total: data.total, paymentMethod: data.paymentMethod,
    paperWidth: data.paperWidth, copies: data.copies,
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
      res.status(500).json({ success: false, error: `Failed to print copy ${i + 1}: ${err}` });
      return;
    }
  }

  res.json({ success: true, method: "network" });
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const { data, total, count } = req.body;
  const parsed = JSON.parse(data);
  await db.prepare("INSERT INTO receipts (receipt_data, total, item_count) VALUES (?, ?, ?)")
    .run(JSON.stringify(parsed), total, count);
  res.json({ success: true });
});

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const receipts = await db.prepare("SELECT * FROM receipts ORDER BY created_at DESC LIMIT ?").all(limit);
  res.json(receipts);
});

export default router;

