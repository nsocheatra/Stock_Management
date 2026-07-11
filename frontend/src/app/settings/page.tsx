import { getSettings } from "@/server/actions";
import { requirePermission, getCurrentUser } from "@/server/auth";
import { T } from "@/components/T";
import SettingsTabs from "./SettingsTabs";

export default async function SettingsPage() {
  await requirePermission("settings.manage");
  const settings = await getSettings();
  const user = await getCurrentUser();

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-indigo-400 bg-clip-text text-transparent">
          <T k="settings.title" />
        </h1>
        <p className="text-sm text-faint mt-1"><T k="settings.subtitle" /></p>
      </div>
      <SettingsTabs settings={settings} isAdmin={user?.role === "admin"} />
    </div>
  );
}
