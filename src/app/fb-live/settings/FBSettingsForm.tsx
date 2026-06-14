"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Save, Eye, EyeOff, Radio, MessageCircle, RadioTower,
} from "lucide-react";

import { saveFBSettings, saveMessengerSettings } from "@/lib/actions";
import FacebookLoginSection from "./FacebookLoginSection";

const liveTab = "live";
const chatbotTab = "chatbot";

export default function FBSettingsForm({
  settings,
  messengerSettings,
  fbUserId,
  fbUserName,
  fbPages,
  fbBusinesses,
}: {
  settings: Record<string, string>;
  messengerSettings: Record<string, string>;
  fbUserId: string;
  fbUserName: string;
  fbPages: string;
  fbBusinesses: string;
}) {
  const [tab, setTab] = useState<"live" | "chatbot">("live");
  const [showToken, setShowToken] = useState(false);
  const [showMsgToken, setShowMsgToken] = useState(false);
  const [saved, setSaved] = useState(false);
  const [origin, setOrigin] = useState("");
  const [fbConnected, setFbConnected] = useState<string | null>(null);
  const [fbError, setFbError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("fb_connected");
    const error = params.get("fb_error");
    if (connected) setFbConnected(connected);
    if (error) setFbError(error);
    if (connected || error) {
      const newParams = new URLSearchParams(window.location.search);
      newParams.delete("fb_connected");
      newParams.delete("fb_error");
      const newUrl = newParams.toString()
        ? `${window.location.pathname}?${newParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  const handleLiveSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const result = await saveFBSettings(fd);
    if (result.success) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleChatbotSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const result = await saveMessengerSettings(fd);
    if (result.success) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const enabled = settings.listening_enabled === "1";
  const messengerEnabled = messengerSettings.messenger_enabled === "1";

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex rounded-xl bg-black/20 p-1 border border-surface">
        <button
          type="button"
          onClick={() => setTab("live")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            tab === "live" ? "bg-violet-600/30 text-violet-200 shadow-sm" : "text-muted hover:text-default"
          }`}
        >
          <RadioTower className="size-4" />
          Live Auto-Ordering
        </button>
        <button
          type="button"
          onClick={() => setTab("chatbot")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            tab === "chatbot" ? "bg-violet-600/30 text-violet-200 shadow-sm" : "text-muted hover:text-default"
          }`}
        >
          <MessageCircle className="size-4" />
          Messenger Chatbot
        </button>
      </div>

      {/* Live Auto-Ordering Settings */}
      {tab === "live" && (
        <form onSubmit={handleLiveSubmit} className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl space-y-6">
          {/* Facebook Login for Business */}
          <div>
            <h3 className="text-sm font-semibold text-default mb-3">
              Sign in with your Facebook Account
            </h3>
            <p className="text-xs text-faint mb-3">
              As Instagram is a part of Meta (ex. Facebook) ecosystem, sign in with
              your Facebook account to create automation. By continuing, Rika System
              will receive ongoing access to the information you share and Meta will
              record when Rika System accesses it.{" "}
              <a
                href="https://www.facebook.com/help"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 underline"
              >
                Learn more about this sharing and the settings you have
              </a>.
            </p>
        <FacebookLoginSection
          fbUserId={fbUserId}
          fbUserName={fbUserName}
          currentPageId={settings.page_id || ""}
          currentPageName={settings.page_name || ""}
          pagesJson={fbPages}
          businessesJson={fbBusinesses}
          savedAppId={settings.app_id || ""}
          savedAppSecret={settings.app_secret || ""}
        />
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-surface">
            <div className="flex items-center gap-2">
              <Radio className={`size-4 ${enabled ? "text-emerald-400" : "text-muted"}`} />
              <span className="text-sm font-semibold text-default">Live Listening</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="hidden" name="listening_enabled" value={enabled ? "1" : "0"} />
              <input
                type="checkbox"
                defaultChecked={enabled}
                onChange={(e) => {
                  const hidden = e.currentTarget.previousElementSibling as HTMLInputElement;
                  hidden.value = e.currentTarget.checked ? "1" : "0";
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 bg-zinc-700" />
            </label>
          </div>

          {/* Page Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Facebook Page Name</label>
              <input name="page_name" defaultValue={settings.page_name} placeholder="e.g. My Store" className="input-field" />
            </div>
            <div>
              <label className="input-label">Facebook Page ID</label>
              <input name="page_id" defaultValue={settings.page_id} placeholder="e.g. 123456789" className="input-field" />
            </div>
          </div>

          {/* Access Token */}
          <div>
            <label className="input-label">Page Access Token</label>
            <div className="relative">
              <input
                name="access_token"
                type={showToken ? "text" : "password"}
                defaultValue={settings.access_token}
                placeholder="EAAxxx..."
                className="input-field pr-10 font-mono text-xs"
              />
              <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-default cursor-pointer">
                {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Match Mode */}
          <div>
            <label className="input-label">Keyword Match Mode</label>
            <select name="match_mode" defaultValue={settings.match_mode || "contains"} className="input-field">
              <option value="contains">Contains (e.g. #product matches any comment with #product)</option>
              <option value="exact">Exact match (comment must be exactly the keyword)</option>
              <option value="starts">Starts with (comment starts with keyword)</option>
            </select>
          </div>

          {/* Webhook Info */}
          <div className="border border-surface rounded-xl p-4 space-y-2">
            <label className="input-label">Webhook Callback URL</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 rounded-lg bg-black/30 border border-surface text-xs font-mono text-violet-300 break-all">
                {origin || "/api/fb-webhook"}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(`${origin}/api/fb-webhook`)}
                className="px-3 py-2 rounded-lg text-xs font-medium bg-surface hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Copy
              </button>
            </div>
            <div className="flex items-center justify-between pt-2">
              <label className="input-label">Verify Token</label>
              <div className="flex items-center gap-2">
                <code className="p-1.5 rounded-lg bg-black/30 border border-surface text-xs font-mono text-amber-300">
                  {settings.verify_token || "—"}
                </code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(settings.verify_token || "")}
                  className="px-2 py-1 rounded-lg text-xs font-medium bg-surface hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Copy
                </button>
              </div>
            </div>
            <p className="text-xs text-faint">Enter this token as the <strong>Verify Token</strong> in your Facebook App webhook settings.</p>
          </div>

          {/* Auto-reply Templates */}
          <div>
            <label className="input-label">Auto-Reply Template (on success)</label>
            <textarea
              name="auto_reply"
              defaultValue={settings.auto_reply}
              rows={2}
              className="input-field resize-none"
            />
            <p className="text-xs text-faint mt-1">Use {'{{name}}'}, {'{{product}}'}, {'{{qty}}'} as placeholders</p>
          </div>

          <div>
            <label className="input-label">Auto-Reply Template (no match)</label>
            <textarea
              name="auto_reply_not_found"
              defaultValue={settings.auto_reply_not_found}
              rows={2}
              className="input-field resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-violet-500/15 border border-violet-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="size-4" />
            Save Live Settings
          </button>

          {saved && (
            <div className="text-xs text-center py-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              Settings saved successfully!
            </div>
          )}

          {/* Status messages */}
          {fbConnected && (
            <div className="text-xs text-center py-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              Facebook account connected successfully! Your first Page has been auto-selected.
            </div>
          )}
          {fbError === "missing_app_id" && (
            <div className="text-xs text-center py-2 rounded-lg bg-rose-500/10 text-rose-400">
              Please save your Facebook App ID and App Secret before signing in with Facebook.
            </div>
          )}
          {fbError === "token_exchange_failed" && (
            <div className="text-xs text-center py-2 rounded-lg bg-rose-500/10 text-rose-400">
              Failed to exchange authorization code. Check your App ID and App Secret.
            </div>
          )}
          {fbError === "user_denied" && (
            <div className="text-xs text-center py-2 rounded-lg bg-amber-500/10 text-amber-400">
              You denied the Facebook login request. Please try again and grant the requested permissions.
            </div>
          )}
          {fbError === "unexpected" && (
            <div className="text-xs text-center py-2 rounded-lg bg-rose-500/10 text-rose-400">
              An unexpected error occurred during Facebook login. Please try again.
            </div>
          )}
        </form>
      )}

      {/* Messenger Chatbot Settings */}
      {tab === "chatbot" && (
        <form onSubmit={handleChatbotSubmit} className="bg-surface-blur border-surface rounded-2xl p-6 shadow-xl space-y-6">
          <h2 className="text-sm font-semibold text-default flex items-center gap-2">
            <MessageCircle className="size-4 text-muted" />
            Facebook Messenger Chatbot
          </h2>

          <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-4 text-sm text-sky-300 space-y-2">
            <p className="font-semibold">Setup instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-sky-200/80">
              <li>Go to <strong>developers.facebook.com</strong> and create an app</li>
              <li>Add the <strong>Messenger</strong> product</li>
              <li>Generate a <strong>Page Access Token</strong> for your Facebook Page</li>
               <li>Set the webhook callback URL to: <code className="text-violet-300">{origin || ""}/api/messenger-webhook</code></li>
              <li>Use the Verify Token shown below when setting up webhooks</li>
              <li>Subscribe to <strong>messages</strong> and <strong>messaging_postbacks</strong> events</li>
              <li>Enable the bot below and save</li>
            </ol>
          </div>

          <div>
            <label className="input-label">Page Access Token</label>
            <div className="relative">
              <input
                name="messenger_page_token"
                type={showMsgToken ? "text" : "password"}
                defaultValue={messengerSettings.messenger_page_token}
                placeholder="EAAxxx..."
                className="input-field pr-10 font-mono text-xs"
              />
              <button type="button" onClick={() => setShowMsgToken(!showMsgToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-default cursor-pointer">
                {showMsgToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-surface">
            <label className="input-label mb-0">Webhook Verify Token</label>
            <code className="p-1.5 rounded-lg bg-black/30 border border-surface text-xs font-mono text-amber-300">
              {messengerSettings.messenger_verify_token || "—"}
            </code>
          </div>

          <div>
            <label className="input-label">Greeting Message</label>
            <textarea name="messenger_greeting" defaultValue={messengerSettings.messenger_greeting} rows={2} className="input-field resize-none" />
            <p className="text-xs text-faint mt-1">Sent when a user starts a conversation or types &ldquo;menu&rdquo;.</p>
          </div>

          <div>
            <label className="input-label">Product Not Found Message</label>
            <textarea name="messenger_not_found" defaultValue={messengerSettings.messenger_not_found} rows={2} className="input-field resize-none" />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="hidden" name="messenger_enabled" value={messengerEnabled ? "1" : "0"} />
            <input
              type="checkbox"
              defaultChecked={messengerEnabled}
              onChange={(e) => { (e.currentTarget.previousElementSibling as HTMLInputElement).value = e.currentTarget.checked ? "1" : "0"; }}
              className="sr-only peer"
            />
            <div className="w-9 h-5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 bg-zinc-700 relative" />
            <span className="text-sm text-default">Enable Messenger Chatbot</span>
          </label>

          <button
            type="submit"
            className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 transition-all duration-200 shadow-lg shadow-violet-500/15 border border-violet-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="size-4" />
            Save Chatbot Settings
          </button>

          {saved && (
            <div className="text-xs text-center py-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              Settings saved successfully!
            </div>
          )}
        </form>
      )}
    </div>
  );
}
