"use client";

import { useState, useTransition } from "react";
import { FileText, Printer, Loader, RotateCcw } from "lucide-react";
import { draftOrderFromFB, getOrderReceipt, resetFBOrder } from "@/lib/actions";

function openPrintReceipt(orderId: number) {
  getOrderReceipt(orderId).then((order) => {
    if (!order) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><title>Receipt #${order.id}</title>
      <style>body{font-family:monospace;font-size:14px;padding:20px;max-width:300px;margin:auto}
      h2{text-align:center}h3{text-align:center;color:#888}
      table{width:100%;border-collapse:collapse;margin:12px 0}
      th,td{padding:4px 0;text-align:left}
      .right{text-align:right}.total{font-weight:bold;border-top:2px dashed #000;padding-top:8px}
      .center{text-align:center;color:#888;margin-top:20px}
      </style></head><body>
      <h2>Order Receipt</h2>
      <h3>#${order.id}</h3>
      <p><strong>${order.customer_name}</strong></p>
      <p style="color:#888;font-size:12px">${new Date(order.created_at).toLocaleString()}</p>
      <table>
        <tr><th>Item</th><th class="right">Qty</th><th class="right">Price</th></tr>
        <tr><td>${order.product_name || "N/A"}</td><td class="right">${order.quantity}</td><td class="right">$${((order.price ?? 0) * order.quantity).toFixed(2)}</td></tr>
      </table>
      <p class="center">Thank you!</p>
      <script>window.print();window.close();</script>
      </body></html>
    `);
    w.document.close();
  });
}

export default function OrderActions({ orderId }: { orderId: number }) {
  const [phase, setPhase] = useState<"draft" | "processing" | "done">("draft");
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    if (phase === "done") {
      openPrintReceipt(orderId);
      return;
    }
    startTransition(async () => {
      setPhase("processing");
      const result = await draftOrderFromFB(orderId);
      if (result?.error) {
        alert(result.error);
        setPhase("draft");
        return;
      }
      setPhase("done");
      openPrintReceipt(orderId);
    });
  };

  const handleClear = () => {
    startTransition(async () => {
      await resetFBOrder(orderId);
      setPhase("draft");
    });
  };

  return (
    <div className="flex items-center justify-end gap-1 opacity-60 group-hover/row:opacity-100 transition-opacity">
      <button
        onClick={handleClick}
        disabled={pending && phase === "processing"}
        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer whitespace-nowrap disabled:opacity-40 ${
          phase === "done"
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
            : "bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20"
        }`}
      >
        {phase === "processing" ? (
          <><Loader className="size-3 animate-spin" /> Processing</>
        ) : phase === "done" ? (
          <><Printer className="size-3" /> Print</>
        ) : (
          <><FileText className="size-3" /> Draft</>
        )}
      </button>
      {phase === "done" && (
        <button
          onClick={handleClear}
          disabled={pending}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 hover:bg-zinc-500/20 transition-all cursor-pointer whitespace-nowrap disabled:opacity-40"
        >
          <RotateCcw className="size-3" />
          Clear
        </button>
      )}
    </div>
  );
}
