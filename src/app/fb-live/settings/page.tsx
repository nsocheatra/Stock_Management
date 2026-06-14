import { getFBSettings } from "@/lib/actions";
import { db } from "@/lib/db";
import FBSettingsForm from "./FBSettingsForm";

function getSetting(key: string): string {
  const row = db.prepare("SELECT value FROM fb_settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? "";
}

function getGlobalSetting(key: string): string {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? "";
}

export default async function FBLiveSettingsPage() {
  const settings = await getFBSettings();
  const fbUserId = getSetting("fb_user_id");
  const fbUserName = getSetting("fb_user_name");
  const fbPages = getSetting("fb_pages");
  const fbBusinesses = getSetting("fb_businesses");

  const messengerSettings: Record<string, string> = {
    messenger_page_token: getGlobalSetting("messenger_page_token"),
    messenger_verify_token: getGlobalSetting("messenger_verify_token"),
    messenger_greeting: getGlobalSetting("messenger_greeting"),
    messenger_not_found: getGlobalSetting("messenger_not_found"),
    messenger_enabled: getGlobalSetting("messenger_enabled"),
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-sm text-faint mt-1">Configure Facebook Live auto-ordering and Messenger chatbot.</p>
      </div>

      <FBSettingsForm
        settings={settings}
        messengerSettings={messengerSettings}
        fbUserId={fbUserId}
        fbUserName={fbUserName}
        fbPages={fbPages}
        fbBusinesses={fbBusinesses}
      />
    </div>
  );
}
