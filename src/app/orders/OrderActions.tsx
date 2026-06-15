"use client";

import { useState, useTransition } from "react";
import { FileText, Printer, Loader } from "lucide-react";
import { convertOrderToSale, getCustomerOrderReceipt } from "@/lib/actions";
import { useTranslation } from "@/i18n/useTranslation";

function openPrintReceipt(orderId: number, t: (key: string, vars?: Record<string, string | number>) => string) {
  getCustomerOrderReceipt(orderId).then((order) => {
    if (!order) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const itemsHtml = order.items.map((item: any) => `
      <tr><td>${item.product_name}</td><td class="right">${item.quantity}</td><td class="right">$${(item.price * item.quantity).toFixed(2)}</td></tr>
    `).join("");
    w.document.write(`
      <html><head><title>${t("receipt.title")} #${order.id}</title>
      <style>body{font-family:monospace;font-size:14px;padding:20px;max-width:300px;margin:auto}
      h2{text-align:center}h3{text-align:center;color:#888}
      table{width:100%;border-collapse:collapse;margin:12px 0}
      th,td{padding:4px 0;text-align:left}
      .right{text-align:right}.total{font-weight:bold;border-top:2px dashed #000;padding-top:8px}
      .center{text-align:center;color:#888;margin-top:20px}
      </style></head><body>
      <h2>${t("receipt.title")}</h2>
      <h3>#${order.id}</h3>
      <p><strong>${order.customer_name || "Walk-in"}</strong></p>
      <p style="color:#888;font-size:12px">${new Date(order.created_at).toLocaleString()}</p>
      <table>
        <tr><th>${t("receipt.item")}</th><th class="right">${t("receipt.qty")}</th><th class="right">${t("receipt.price")}</th></tr>
        ${itemsHtml}
      </table>
      <p class="center">${t("receipt.thankYou")}</p>
      <script>window.print();window.close();</script>
      </body></html>
    `);
    w.document.close();
  });
}

export default function OrderActions({ orderId, saleId, status }: { orderId: number; saleId: number | null; status: string }) {
  const [phase, setPhase] = useState<"draft" | "processing" | "done">(saleId ? "done" : "draft");
  const [pending, startTransition] = useTransition();
  const { t } = useTranslation();

  const handleClick = () => {
    if (phase === "done") {
      openPrintReceipt(orderId, t);
      return;
    }
    startTransition(async () => {
      setPhase("processing");
      const result = await convertOrderToSale(orderId);
      if (result?.error) {
        alert(result.error);
        setPhase("draft");
        return;
      }
      setPhase("done");
      openPrintReceipt(orderId, t);
    });
  };

  if (status !== "delivered" && !saleId) return null;

  return (
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
        <><Printer className="size-3" /> Print Receipt</>
      ) : (
        <><FileText className="size-3" /> Convert to Sale</>
      )}
    </button>
  );
}
