import { getSettings } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { T } from "@/components/T";
import SettingsTabs from "./SettingsTabs";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/");
  const settings = await getSettings();

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
          <T k="settings.title" />
        </h1>
        <p className="text-sm text-faint mt-1"><T k="settings.subtitle" /></p>
        <p className="text-xs text-faint mt-1">
          <T k="settings.messengerMoved" />{" "}
          <a href="/fb-live/settings" className="text-violet-400 hover:text-violet-300 underline"><T k="settings.fbLiveSettings" /></a>.
        </p>
      </div>
      <SettingsTabs settings={settings} />
    </div>
  );
}
