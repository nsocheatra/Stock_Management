import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

function getSetting(key: string): string {
  const row = db.prepare("SELECT value FROM fb_settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? "";
}

function setSetting(key: string, value: string) {
  db.prepare("INSERT OR REPLACE INTO fb_settings (key, value) VALUES (?, ?)").run(key, value);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const appId = getSetting("app_id");
  const appSecret = getSetting("app_secret");

  if (!appId) {
    return NextResponse.redirect(new URL("/fb-live/settings?fb_error=missing_app_id", request.url));
  }

  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  const redirectUri = `${baseUrl}/api/auth/facebook`;

  // User denied or error from Facebook
  if (error) {
    return NextResponse.redirect(new URL("/fb-live/settings?fb_error=user_denied", request.url));
  }

  // No code → initiate OAuth by redirecting to Facebook
  if (!code) {
    const stateToken = Math.random().toString(36).slice(2, 15);

    const fbUrl = new URL("https://www.facebook.com/dialog/oauth");
    fbUrl.searchParams.set("client_id", appId);
    fbUrl.searchParams.set("redirect_uri", redirectUri);
    fbUrl.searchParams.set("state", stateToken);
    fbUrl.searchParams.set("scope", "pages_show_list,pages_read_engagement,pages_messaging,business_management");
    fbUrl.searchParams.set("response_type", "code");

    return NextResponse.redirect(fbUrl);
  }

  // Has code → handle OAuth callback
  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL("/fb-live/settings?fb_error=token_exchange_failed", request.url));
    }

    // Exchange short-lived token for long-lived token
    const llRes = await fetch(
      `https://graph.facebook.com/v22.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    );
    const llData = await llRes.json();
    const userAccessToken = llData.access_token || tokenData.access_token;

    // Get user info
    const meRes = await fetch(
      `https://graph.facebook.com/v22.0/me?fields=id,name&access_token=${userAccessToken}`
    );
    const meData = await meRes.json();

    // Get pages the user manages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v22.0/me/accounts?access_token=${userAccessToken}`
    );
    const pagesData = await pagesRes.json();

    // Get businesses the user has access to
    const bizRes = await fetch(
      `https://graph.facebook.com/v22.0/me/businesses?access_token=${userAccessToken}`
    );
    const bizData = await bizRes.json();

    // Save user info
    setSetting("fb_user_id", meData.id || "");
    setSetting("fb_user_name", meData.name || "");

    // Save available pages and businesses for the selection UI
    setSetting("fb_pages", JSON.stringify(pagesData.data || []));
    setSetting("fb_businesses", JSON.stringify(bizData.data || []));

    // Auto-select the first page if available
    if (pagesData.data && pagesData.data.length > 0) {
      const firstPage = pagesData.data[0];
      setSetting("page_id", firstPage.id);
      setSetting("page_name", firstPage.name || "");
      setSetting("access_token", firstPage.access_token || "");
    }

    return NextResponse.redirect(new URL("/fb-live/settings?fb_connected=1", request.url));
  } catch (err) {
    console.error("Facebook OAuth error:", err);
    return NextResponse.redirect(new URL("/fb-live/settings?fb_error=unexpected", request.url));
  }
}
