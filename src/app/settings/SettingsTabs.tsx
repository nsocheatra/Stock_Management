"use client";

import { useState } from "react";
import { Printer, Bot, Save } from "lucide-react";
import { saveSettings, sendTelegramNotification } from "@/lib/actions";

export default function SettingsTabs({ settings }: { settings: Record<string, string> }) {
  const [tab, setTab] = useState<"printer" | "telegram">("printer");
  const [saved, setSaved] = useState(false);
  const [tgStatus, setTgStatus] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await saveSettings(fd);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const testTelegram = async () => {
    setTgStatus("sending...");
    await sendTelegramNotification("🧪 Test notification from Stock Manager\nIf you see this, Telegram is configured correctly!");
    setTgStatus("sent! check your Telegram");
    setTimeout(() => setTgStatus(""), 3000);
  };

  const tabs = [
    { id: "printer" as const, label: "Printer & Receipt", icon: Printer },
    { id: "telegram" as const, label: "Telegram Bot", icon: Bot },
  ];

  return (
    <form onSubmit={handleSubmit}>
      {/* Tabs */}
      <div className="flex rounded-xl bg-black/20 p-1 border border-surface mb-6">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                tab === t.id ? "bg-violet-600/30 text-violet-200 shadow-sm" : "text-muted hover:text-default"
              }`}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Printer Tab */}
      {tab === "printer" && (
        <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-semibold text-default flex items-center gap-2">
            <Printer className="size-4 text-muted" />
            Receipt Printer Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Printer Type</label>
              <select name="printer_type" defaultValue={settings.printer_type} className="input-field">
                <option value="browser">Browser Print (window.print)</option>
                <option value="thermal">ESC/POS Thermal Printer</option>
                <option value="network">Network Printer (IP)</option>
              </select>
            </div>
            <div>
              <label className="input-label">Paper Width (mm)</label>
              <select name="paper_width" defaultValue={settings.paper_width} className="input-field">
                <option value="58">58mm (thermal mini)</option>
                <option value="80">80mm (standard)</option>
                <option value="76">76mm (dot matrix)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="input-label">Store Name</label>
              <input name="store_name" defaultValue={settings.store_name} className="input-field" />
            </div>
            <div>
              <label className="input-label">Store Phone</label>
              <input name="store_phone" defaultValue={settings.store_phone} className="input-field" />
            </div>
          </div>

          <div>
            <label className="input-label">Store Address</label>
            <input name="store_address" defaultValue={settings.store_address} className="input-field" />
          </div>

          <div>
            <label className="input-label">Receipt Header</label>
            <input name="receipt_header" defaultValue={settings.receipt_header} className="input-field" />
          </div>

          <div>
            <label className="input-label">Receipt Footer</label>
            <input name="receipt_footer" defaultValue={settings.receipt_footer} className="input-field" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Copies</label>
              <input name="receipt_copies" type="number" min="1" max="5" defaultValue={settings.receipt_copies} className="input-field" />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="hidden" name="auto_print" value={settings.auto_print === "1" ? "0" : "1"} />
                <input
                  type="checkbox"
                  defaultChecked={settings.auto_print === "1"}
                  onChange={(e) => {
                    const hidden = e.currentTarget.previousElementSibling as HTMLInputElement;
                    hidden.value = e.currentTarget.checked ? "1" : "0";
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 bg-zinc-700 relative" />
                <span className="text-sm text-default">Auto-print after sale</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Telegram Tab */}
      {tab === "telegram" && (
        <div className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-semibold text-default flex items-center gap-2">
            <Bot className="size-4 text-muted" />
            Telegram Bot
          </h2>

          <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 text-sm text-sky-300 space-y-2">
            <p className="font-semibold">Setup instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-sky-200/80">
              <li>Message <strong>@BotFather</strong> on Telegram to create a bot</li>
              <li>Copy the bot token and paste it below</li>
              <li>Start a chat with your bot, then message <strong>/start</strong></li>
              <li>Set the webhook URL to: <code className="text-violet-300">{typeof window !== "undefined" ? window.location.origin : ""}/api/telegram-webhook</code></li>
              <li>Enable the bot below and save</li>
              <li>Test with the button at the bottom</li>
            </ol>
          </div>

          <div>
            <label className="input-label">Bot Token</label>
            <input name="telegram_bot_token" type="password" defaultValue={settings.telegram_bot_token} className="input-field font-mono text-xs" placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" />
          </div>

          <div>
            <label className="input-label">Authorized Chat IDs (comma separated)</label>
            <input name="telegram_chat_ids" defaultValue={settings.telegram_chat_ids} className="input-field" placeholder="123456789,987654321" />
            <p className="text-xs text-faint mt-1">Message <strong>@userinfobot</strong> on Telegram to get your chat ID</p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="hidden" name="telegram_enabled" value={settings.telegram_enabled === "1" ? "0" : "1"} />
              <input
                type="checkbox"
                defaultChecked={settings.telegram_enabled === "1"}
                onChange={(e) => { (e.currentTarget.previousElementSibling as HTMLInputElement).value = e.currentTarget.checked ? "1" : "0"; }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 bg-zinc-700 relative" />
              <span className="text-sm text-default">Enable Telegram Bot</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="hidden" name="telegram_notify_low_stock" value={settings.telegram_notify_low_stock === "1" ? "0" : "1"} />
              <input
                type="checkbox"
                defaultChecked={settings.telegram_notify_low_stock === "1"}
                onChange={(e) => { (e.currentTarget.previousElementSibling as HTMLInputElement).value = e.currentTarget.checked ? "1" : "0"; }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 bg-zinc-700 relative" />
              <span className="text-sm text-default">Low stock alerts</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="hidden" name="telegram_notify_daily" value={settings.telegram_notify_daily === "1" ? "0" : "1"} />
              <input
                type="checkbox"
                defaultChecked={settings.telegram_notify_daily === "1"}
                onChange={(e) => { (e.currentTarget.previousElementSibling as HTMLInputElement).value = e.currentTarget.checked ? "1" : "0"; }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 bg-zinc-700 relative" />
              <span className="text-sm text-default">Daily summary reports</span>
            </label>
          </div>

          <button type="button" onClick={testTelegram} className="px-4 py-2 rounded-xl text-sm font-medium border border-surface text-muted hover:text-default hover:bg-surface transition-all cursor-pointer">
            Test Telegram Notification
          </button>
          {tgStatus && <p className="text-xs text-emerald-400">{tgStatus}</p>}
        </div>
      )}

      {/* Submit */}
      <div className="mt-6 space-y-3">
        <button
          type="submit"
          className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-violet-500/15 border border-violet-500/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Save className="size-4" />
          Save Settings
        </button>
        {saved && (
          <div className="text-xs text-center py-2 rounded-lg bg-emerald-500/10 text-emerald-400">Settings saved successfully!</div>
        )}
      </div>
    </form>
  );
}
