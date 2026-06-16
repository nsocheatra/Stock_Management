import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

async function getSetting(key: string): Promise<string> {
  const row = await db.prepare("SELECT value FROM fb_settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? "";
}

async function setSetting(key: string, value: string) {
  await db.prepare("INSERT OR REPLACE INTO fb_settings (key, value) VALUES (?, ?)").run(key, value);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const appId = await getSetting("app_id");
  const appSecret = await getSetting("app_secret");

  if (!appId) {
    return NextResponse.redirect(new URL("/fb-live/settings?fb_error=missing_app_id", request.url));
  }

  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  const redirectUri = `${baseUrl}/api/auth/facebook`;

  if (error) {
    return NextResponse.redirect(new URL("/fb-live/settings?fb_error=user_denied", request.url));
  }

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

  try {
    const tokenRes = await fetch(
      `https://graph.facebook.com/v22.0/oauth/access_token?client_id=${appId}&redirect_uri=${redirectUri}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL("/fb-live/settings?fb_error=token_exchange_failed", request.url));
    }

    const llRes = await fetch(
      `https://graph.facebook.com/v22.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    );
    const llData = await llRes.json();
    const userAccessToken = llData.access_token || tokenData.access_token;

    const meRes = await fetch(
      `https://graph.facebook.com/v22.0/me?fields=id,name&access_token=${userAccessToken}`
    );
    const meData = await meRes.json();

    const pagesRes = await fetch(
      `https://graph.facebook.com/v22.0/me/accounts?access_token=${userAccessToken}`
    );
    const pagesData = await pagesRes.json();

    const bizRes = await fetch(
      `https://graph.facebook.com/v22.0/me/businesses?access_token=${userAccessToken}`
    );
    const bizData = await bizRes.json();

    await setSetting("fb_user_id", meData.id || "");
    await setSetting("fb_user_name", meData.name || "");

    await setSetting("fb_pages", JSON.stringify(pagesData.data || []));
    await setSetting("fb_businesses", JSON.stringify(bizData.data || []));

    if (pagesData.data && pagesData.data.length > 0) {
      const firstPage = pagesData.data[0];
      await setSetting("page_id", firstPage.id);
      await setSetting("page_name", firstPage.name || "");
      await setSetting("access_token", firstPage.access_token || "");
    }

    return NextResponse.redirect(new URL("/fb-live/settings?fb_connected=1", request.url));
  } catch (err) {
    console.error("Facebook OAuth error:", err);
    return NextResponse.redirect(new URL("/fb-live/settings?fb_error=unexpected", request.url));
  }
}
