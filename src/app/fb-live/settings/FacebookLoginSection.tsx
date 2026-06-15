"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Building2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { saveFBSettings, selectFBPage } from "@/lib/actions";
import { useTranslation } from "@/i18n/useTranslation";

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

interface FBPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  tasks?: string[];
}

interface FBBusiness {
  id: string;
  name: string;
}

export default function FacebookLoginSection({
  fbUserId,
  fbUserName,
  currentPageId,
  currentPageName,
  pagesJson,
  businessesJson,
  savedAppId,
  savedAppSecret,
}: {
  fbUserId: string;
  fbUserName: string;
  currentPageId: string;
  currentPageName: string;
  pagesJson: string;
  businessesJson: string;
  savedAppId: string;
  savedAppSecret: string;
}) {
  const [showPages, setShowPages] = useState(false);
  const [showBiz, setShowBiz] = useState(false);
  const [changing, setChanging] = useState(false);
  const [showAppId, setShowAppId] = useState(false);
  const [showAppSecret, setShowAppSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const router = useRouter();
  const { t } = useTranslation();

  const pages: FBPage[] = pagesJson ? JSON.parse(pagesJson) : [];
  const businesses: FBBusiness[] = businessesJson ? JSON.parse(businessesJson) : [];
  const isConnected = !!fbUserId;

  const handleSelectPage = async (page: FBPage) => {
    setChanging(true);
    try {
      const fd = new FormData();
      fd.set("page_id", page.id);
      fd.set("page_name", page.name);
      fd.set("access_token", page.access_token);
      await selectFBPage(fd);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setChanging(false);
    }
  };

  const handleSignIn = async (e: React.MouseEvent) => {
    e.preventDefault();
    const form = (e.currentTarget as HTMLElement).closest("form");
    if (!form) return;
    const fd = new FormData(form);
    const appId = fd.get("app_id") as string;
    const appSecret = fd.get("app_secret") as string;
    if (!appId || !appSecret) {
      setSaveError(t("fbLive.settings.facebookLogin.validationError"));
      return;
    }
    setSaveError("");
    setSaving(true);
    try {
      await saveFBSettings(fd);
      window.location.href = "/api/auth/facebook";
    } catch {
      setSaveError(t("fbLive.settings.facebookLogin.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`rounded-xl border p-4 space-y-4 transition-all duration-300 ${
        isConnected
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-surface bg-surface-blur"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FacebookIcon className="size-5 text-[#1877F2]" />
          <span className="text-sm font-semibold text-default">
            {t("fbLive.settings.facebookLogin.connected")}
          </span>
        </div>
        {isConnected ? (
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
            <CheckCircle className="size-3" />
            {t("fbLive.settings.facebookLogin.connectedBadge")}
          </span>
        ) : null}
      </div>

      {isConnected ? (
        <>
          <div className="flex items-center gap-2 text-xs text-faint bg-black/20 rounded-lg px-3 py-2">
            <span className="text-default font-medium truncate">
              {fbUserName || fbUserId}
            </span>
          </div>

          {currentPageId && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface bg-black/20">
              <Building2 className="size-4 text-violet-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-default truncate">{currentPageName}</p>
                <p className="text-[10px] text-faint font-mono truncate">ID: {currentPageId}</p>
              </div>
            </div>
          )}

          {pages.length > 1 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowPages(!showPages)}
                className="flex items-center justify-between w-full text-xs font-medium text-muted hover:text-default transition-colors px-1 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Building2 className="size-3" />
                  {t("fbLive.settings.facebookLogin.pagesAvailable", { count: pages.length })}
                </span>
                {showPages ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
              {showPages && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {pages.map((page) => (
                    <button
                      key={page.id}
                      type="button"
                      disabled={changing}
                      onClick={() => handleSelectPage(page)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all cursor-pointer ${
                        page.id === currentPageId
                          ? "bg-violet-600/20 text-violet-300 border border-violet-500/30"
                          : "hover:bg-surface text-muted border border-transparent"
                      }`}
                    >
                      <span className="font-semibold">{page.name}</span>
                      {page.id === currentPageId && (
                        <span className="float-right text-[10px] text-violet-400">{t("fbLive.settings.facebookLogin.active")}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {businesses.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowBiz(!showBiz)}
                className="flex items-center justify-between w-full text-xs font-medium text-muted hover:text-default transition-colors px-1 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Building2 className="size-3" />
                  {t("fbLive.settings.facebookLogin.businesses", { count: businesses.length })}
                </span>
                {showBiz ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
              {showBiz && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {businesses.map((biz) => (
                    <div key={biz.id} className="px-3 py-2 rounded-lg text-xs text-muted border border-surface bg-black/10">
                      <span className="font-medium text-default">{biz.name}</span>
                      <span className="float-right text-[10px] text-faint font-mono">ID: {biz.id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pt-1">
            <a
              href="/api/auth/facebook"
              className="text-xs text-[#1877F2] hover:text-[#166FE5] transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
            >
              <RefreshCw className="size-3" />
              {t("fbLive.settings.facebookLogin.switchAccount")}
            </a>
          </div>

          {pages.length === 0 && (
            <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
              <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
              <span>
                {t("fbLive.settings.facebookLogin.noPages")}
              </span>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-xs text-faint">
            {t("fbLive.settings.facebookLogin.notConnected")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="input-label">{t("fbLive.settings.facebookLogin.appId")}</label>
              <div className="relative">
                <input
                  name="app_id"
                  type={showAppId ? "text" : "password"}
                  defaultValue={savedAppId}
                  placeholder={t("fbLive.settings.facebookLogin.appIdPlaceholder")}
                  className="input-field pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowAppId(!showAppId)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-default cursor-pointer"
                >
                  {showAppId ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="input-label">{t("fbLive.settings.facebookLogin.appSecret")}</label>
              <div className="relative">
                <input
                  name="app_secret"
                  type={showAppSecret ? "text" : "password"}
                  defaultValue={savedAppSecret}
                  placeholder={t("fbLive.settings.facebookLogin.appSecretPlaceholder")}
                  className="input-field pr-10 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowAppSecret(!showAppSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-default cursor-pointer"
                >
                  {showAppSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          {saveError && (
            <div className="text-xs text-center py-2 rounded-lg bg-rose-500/10 text-rose-400">
              {saveError}
            </div>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={handleSignIn}
            className="w-full py-3 rounded-lg text-sm font-semibold text-white bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-[#1877F2]/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <FacebookIcon className="size-5" />
            {saving ? t("fbLive.settings.facebookLogin.saving") : t("fbLive.settings.facebookLogin.signIn")}
          </button>

          <p className="text-xs text-faint text-center">
            {t("fbLive.settings.facebookLogin.note")}
          </p>
        </>
      )}
    </div>
  );
}
