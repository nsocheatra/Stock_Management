"use client";

import { Printer, X } from "lucide-react";

type ReceiptItem = { name: string; sku: string; price: number; qty: number };

export default function ReceiptView({
  items, total, storeName, storeAddress, storePhone, header, footer, onClose,
}: {
  items: ReceiptItem[];
  total: number;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  header: string;
  footer: string;
  onClose: () => void;
}) {
  const print = () => {
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    printWin.document.write(`
      <html><head><title>Receipt</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 10px; }
        h1, h2 { text-align: center; margin: 0; }
        .header { text-align: center; margin-bottom: 10px; }
        .header h1 { font-size: 16px; }
        .header p { font-size: 10px; margin: 2px 0; }
        hr { border: dashed 1px #000; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 10px; border-bottom: 1px dashed #000; padding: 4px 0; }
        td { padding: 4px 0; font-size: 11px; }
        .right { text-align: right; }
        .total { font-size: 14px; font-weight: bold; text-align: right; margin-top: 8px; }
        .footer { text-align: center; margin-top: 10px; font-size: 10px; }
        @media print { body { width: auto; } }
      </style></head><body>
        <div class="header">
          <h1>${storeName}</h1>
          ${storeAddress ? `<p>${storeAddress}</p>` : ""}
          ${storePhone ? `<p>Tel: ${storePhone}</p>` : ""}
          <p>${new Date().toLocaleString()}</p>
        </div>
        <hr/>
        <p style="text-align:center;font-size:11px;">${header}</p>
        <hr/>
        <table>
          <tr><th>Item</th><th class="right">Qty</th><th class="right">Price</th><th class="right">Total</th></tr>
          ${items.map(i => `<tr><td>${i.name}</td><td class="right">${i.qty}</td><td class="right">$${i.price.toFixed(2)}</td><td class="right">$${(i.price * i.qty).toFixed(2)}</td></tr>`).join("")}
        </table>
        <hr/>
        <div class="total">TOTAL: $${total.toFixed(2)}</div>
        <hr/>
        <div class="footer">${footer}</div>
        <p style="text-align:center;font-size:10px;margin-top:8px;">Thank you for your purchase!</p>
        <script>window.print();window.onafterprint=()=>window.close();</script>
      </body></html>
    `);
    printWin.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-default">Receipt Preview</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-muted cursor-pointer">
            <X className="size-4" />
          </button>
        </div>

        <div className="font-mono text-xs leading-relaxed bg-black/40 rounded-xl p-4 border border-zinc-800">
          <div className="text-center mb-3">
            <p className="text-sm font-bold text-default">{storeName}</p>
            {storeAddress && <p className="text-faint">{storeAddress}</p>}
            {storePhone && <p className="text-faint">Tel: {storePhone}</p>}
            <p className="text-faint">{new Date().toLocaleString()}</p>
          </div>
          <div className="border-t border-dashed border-zinc-700 my-2" />
          {header && <p className="text-center text-faint mb-2">{header}</p>}
          <div className="border-t border-dashed border-zinc-700 my-2" />
          {items.map((item, i) => (
            <div key={i} className="flex justify-between py-0.5">
              <span className="truncate flex-1">{item.name}</span>
              <span className="text-faint mx-2">x{item.qty}</span>
              <span className="font-semibold">${(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-dashed border-zinc-700 my-2" />
          <div className="flex justify-between text-sm font-bold text-default mt-1">
            <span>TOTAL</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="border-t border-dashed border-zinc-700 my-2" />
          {footer && <p className="text-center text-faint mt-2">{footer}</p>}
          <p className="text-center text-faint mt-1">Thank you!</p>
        </div>

        <button
          onClick={print}
          className="w-full mt-4 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/15 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Printer className="size-4" />
          Print Receipt
        </button>
      </div>
    </div>
  );
}
