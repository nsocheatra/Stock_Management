"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/i18n/useTranslation";
import { Printer, Bot, AlertTriangle, Save } from "lucide-react";
import { saveSettings, sendTelegramNotification, clearAllData } from "@/lib/actions";

export default function SettingsTabs({ settings, isAdmin }: { settings: Record<string, string>; isAdmin: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [tab, setTab] = useState<"printer" | "telegram" | "danger">("printer");
  const [saved, setSaved] = useState(false);
  const [tgStatus, setTgStatus] = useState("");
  const [clearing, setClearing] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await saveSettings(fd);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const testTelegram = async () => {
    setTgStatus(t("settings.telegram.sending"));
    await sendTelegramNotification("🧪 Test notification from Stock Manager\nIf you see this, Telegram is configured correctly!");
    setTgStatus(t("settings.telegram.sent"));
    setTimeout(() => setTgStatus(""), 3000);
  };

  const tabs = [
    { id: "printer" as const, label: t("settings.printer.title"), icon: Printer },
    { id: "telegram" as const, label: t("settings.telegram.title"), icon: Bot },
    ...(isAdmin ? [{ id: "danger" as const, label: t("settings.dangerZone.title"), icon: AlertTriangle }] : []),
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
            {t("settings.printer.title")}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">{t("settings.printer.type")}</label>
              <select name="printer_type" defaultValue={settings.printer_type} className="input-field">
                <option value="browser">{t("settings.printer.typeOptions.browser")}</option>
                <option value="thermal">{t("settings.printer.typeOptions.thermal")}</option>
                <option value="network">{t("settings.printer.typeOptions.network")}</option>
              </select>
            </div>
            <div>
              <label className="input-label">{t("settings.printer.paperWidth")}</label>
              <select name="paper_width" defaultValue={settings.paper_width} className="input-field">
                <option value="58">{t("settings.printer.paperOptions.58")}</option>
                <option value="80">{t("settings.printer.paperOptions.80")}</option>
                <option value="76">{t("settings.printer.paperOptions.76")}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="input-label">{t("settings.printer.storeName")}</label>
              <input name="store_name" defaultValue={settings.store_name} className="input-field" />
            </div>
            <div>
              <label className="input-label">{t("settings.printer.storePhone")}</label>
              <input name="store_phone" defaultValue={settings.store_phone} className="input-field" />
            </div>
          </div>

          <div>
            <label className="input-label">{t("settings.printer.storeAddress")}</label>
            <input name="store_address" defaultValue={settings.store_address} className="input-field" />
          </div>

          <div>
            <label className="input-label">{t("settings.printer.receiptHeader")}</label>
            <input name="receipt_header" defaultValue={settings.receipt_header} className="input-field" />
          </div>

          <div>
            <label className="input-label">{t("settings.printer.receiptFooter")}</label>
            <input name="receipt_footer" defaultValue={settings.receipt_footer} className="input-field" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">{t("settings.printer.copies")}</label>
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
                <span className="text-sm text-default">{t("settings.printer.autoPrint")}</span>
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
            {t("settings.telegram.title")}
          </h2>

          <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 text-sm text-sky-300 space-y-2">
            <p className="font-semibold">{t("settings.telegram.setupTitle")}</p>
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
            <label className="input-label">{t("settings.telegram.botToken")}</label>
            <input name="telegram_bot_token" type="password" defaultValue={settings.telegram_bot_token} className="input-field font-mono text-xs" placeholder={t("settings.telegram.botTokenPlaceholder")} />
          </div>

          <div>
            <label className="input-label">{t("settings.telegram.chatIds")}</label>
            <input name="telegram_chat_ids" defaultValue={settings.telegram_chat_ids} className="input-field" placeholder={t("settings.telegram.chatIdsPlaceholder")} />
            <p className="text-xs text-faint mt-1">{t("settings.telegram.chatIdsHint")}</p>
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
              <span className="text-sm text-default">{t("settings.telegram.enable")}</span>
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
              <span className="text-sm text-default">{t("settings.telegram.lowStockAlerts")}</span>
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
              <span className="text-sm text-default">{t("settings.telegram.dailySummary")}</span>
            </label>
          </div>

          <button type="button" onClick={testTelegram} className="px-4 py-2 rounded-xl text-sm font-medium border border-surface text-muted hover:text-default hover:bg-surface transition-all cursor-pointer">
            {t("settings.telegram.test")}
          </button>
          {tgStatus && <p className="text-xs text-emerald-400">{tgStatus}</p>}
        </div>
      )}

      {/* Danger Zone */}
      {tab === "danger" && (
        <div className="bg-surface-blur border border-rose-500/30 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-semibold text-rose-400 flex items-center gap-2">
            <AlertTriangle className="size-4" />
            {t("settings.dangerZone.title")}
          </h2>
          <p className="text-sm text-rose-300/80">
            {t("settings.dangerZone.description")}
          </p>
          <p className="text-xs text-rose-400/60">
            Type <strong className="text-rose-300">DELETE</strong> to confirm:
          </p>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={t("settings.dangerZone.confirmPlaceholder")}
            className="input-field border-rose-500/30 focus:border-rose-500 text-rose-300"
          />
          <button
            type="button"
            disabled={confirmText !== "DELETE" || clearing}
            onClick={async () => {
              setClearing(true);
              try {
                await clearAllData();
                router.refresh();
                setConfirmText("");
              } catch { }
              setClearing(false);
            }}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-rose-500/15 border border-rose-500/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <AlertTriangle className="size-4" />
            {clearing ? t("settings.dangerZone.clearing") : t("settings.dangerZone.clear")}
          </button>
        </div>
      )}

      {/* Submit */}
      <div className="mt-6 space-y-3">
        <button
          type="submit"
          className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-violet-500/15 border border-violet-500/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Save className="size-4" />
          {t("settings.saveSettings")}
        </button>
        {saved && (
          <div className="text-xs text-center py-2 rounded-lg bg-emerald-500/10 text-emerald-400">{t("settings.saveSuccess")}</div>
        )}
      </div>
    </form>
  );
}
