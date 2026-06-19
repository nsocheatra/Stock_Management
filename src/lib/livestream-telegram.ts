import { db } from "./db";

async function getTelegramConfig() {
  const token = await db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get() as { value: string } | undefined;
  const chatIds = await db.prepare("SELECT value FROM settings WHERE key = 'telegram_chat_ids'").get() as { value: string } | undefined;
  const enabled = await db.prepare("SELECT value FROM settings WHERE key = 'telegram_enabled'").get() as { value: string } | undefined;
  return {
    token: token?.value || "",
    chatIds: (chatIds?.value || "").split(",").map((s) => s.trim()).filter(Boolean),
    enabled: enabled?.value === "1",
  };
}

export async function sendOrderNotification(order: {
  order_number: string;
  customer_name: string;
  items: { product_name: string; quantity: number }[];
  total: number;
  status: string;
}) {
  const config = await getTelegramConfig();
  if (!config.enabled || !config.token || config.chatIds.length === 0) return;

  const emojiMap: Record<string, string> = {
    draft: "📝", processing: "⚙️", packed: "📦", delivery: "🚚", completed: "✅", cancelled: "❌",
  };
  const emoji = emojiMap[order.status] || "📋";
  const itemsText = order.items.map((i) => `• ${i.product_name} x${i.quantity}`).join("\n");
  const message = `${emoji} *Livestream Order Update*\n\nOrder: #${order.order_number}\nCustomer: ${order.customer_name}\nItems:\n${itemsText}\nTotal: $${order.total.toFixed(2)}\nStatus: *${order.status.toUpperCase()}*`;

  for (const chatId of config.chatIds) {
    try {
      const url = `https://api.telegram.org/bot${config.token}/sendMessage`;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" }),
      });
    } catch (e) {
      console.error("Telegram send failed for", chatId, e);
    }
  }
}
