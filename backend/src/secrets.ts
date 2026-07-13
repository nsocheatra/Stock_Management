import { db } from "./db.js";

const SECRET_KEYS = [
  "telegram_bot_token",
  "telegram_chat_ids",
  "telegram_enabled",
  "facebook_access_token",
  "facebook_app_secret",
  "facebook_app_id",
] as const;

type SecretKey = (typeof SECRET_KEYS)[number];

const ENV_MAP: Record<SecretKey, string> = {
  telegram_bot_token: "TELEGRAM_BOT_TOKEN",
  telegram_chat_ids: "TELEGRAM_CHAT_IDS",
  telegram_enabled: "TELEGRAM_ENABLED",
  facebook_access_token: "FACEBOOK_ACCESS_TOKEN",
  facebook_app_secret: "FACEBOOK_APP_SECRET",
  facebook_app_id: "FACEBOOK_APP_ID",
};

export async function getSecret(key: SecretKey): Promise<string | undefined> {
  const envKey = ENV_MAP[key];
  const envVal = process.env[envKey];
  if (envVal) return envVal;

  const row = await db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value;
}

export function isSecretKey(key: string): key is SecretKey {
  return SECRET_KEYS.includes(key as SecretKey);
}
