import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { serverEnvironment } from "@/lib/platform/env";
import { HttpError } from "@/lib/platform/http";
import { isRouteraApiKey } from "@/lib/platform/routera";
import { supabaseService } from "@/lib/platform/supabase";

const ROUTERA_SECRET_NAME = "routera_api_key";
const FALLBACK_SETTINGS_KEY = "private_platform_secrets";
const ENCRYPTION_VERSION = "v1";

export interface RouteraCredential {
  apiKey: string;
  configured: boolean;
  source: "admin" | "vercel" | "none";
  suffix: string;
}

export async function resolveRouteraCredential(): Promise<RouteraCredential> {
  try {
    const encrypted = await readEncryptedSecret(ROUTERA_SECRET_NAME);
    if (encrypted) {
      const apiKey = decryptSecret(ROUTERA_SECRET_NAME, encrypted);
      if (isRouteraApiKey(apiKey)) return credential(apiKey, "admin");
    }
  } catch (error) {
    if (!isRecoverableSecretStorageError(error)) throw error;
    // The Vercel key remains a safe fallback while the secrets schema is being installed.
  }

  const apiKey = serverEnvironment().routeraApiKey;
  return isRouteraApiKey(apiKey) ? credential(apiKey, "vercel") : credential("", "none");
}

export async function saveRouteraCredential(apiKey: string, actorId: string): Promise<RouteraCredential> {
  const normalized = String(apiKey || "").trim();
  if (!isRouteraApiKey(normalized) || normalized.length > 500) {
    throw new HttpError(400, "Enter a valid Routera API key beginning with rta_.");
  }
  const encrypted = encryptSecret(ROUTERA_SECRET_NAME, normalized);
  const supabase = supabaseService();
  const { error } = await supabase.from("platform_secrets").upsert(
    {
      key: ROUTERA_SECRET_NAME,
      encrypted_value: encrypted,
      updated_by: actorId,
    },
    { onConflict: "key" }
  );
  if (error) {
    const storageError = secretStorageError(error.message);
    if (!isRecoverableSecretStorageError(storageError)) throw storageError;
    await writeSettingsSecret(ROUTERA_SECRET_NAME, encrypted, actorId);
  }
  return credential(normalized, "admin");
}

export async function removeRouteraCredential(): Promise<RouteraCredential> {
  const supabase = supabaseService();
  const { error } = await supabase.from("platform_secrets").delete().eq("key", ROUTERA_SECRET_NAME);
  if (error) {
    const storageError = secretStorageError(error.message);
    if (!isRecoverableSecretStorageError(storageError)) throw storageError;
  }
  await removeSettingsSecret(ROUTERA_SECRET_NAME);
  const fallback = serverEnvironment().routeraApiKey;
  return isRouteraApiKey(fallback) ? credential(fallback, "vercel") : credential("", "none");
}

async function readEncryptedSecret(name: string): Promise<string> {
  try {
    const primary = await readPlatformSecret(name);
    if (primary) return primary;
  } catch (error) {
    if (!isRecoverableSecretStorageError(error)) throw error;
  }
  return readSettingsSecret(name);
}

async function readPlatformSecret(name: string): Promise<string> {
  const { data, error } = await supabaseService()
    .from("platform_secrets")
    .select("encrypted_value")
    .eq("key", name)
    .maybeSingle();
  if (error) throw secretStorageError(error.message);
  return String(data?.encrypted_value || "");
}

async function readSettingsSecret(name: string): Promise<string> {
  const { data, error } = await supabaseService()
    .from("site_settings")
    .select("value")
    .eq("key", FALLBACK_SETTINGS_KEY)
    .maybeSingle();
  if (error) throw settingsStorageError(error.message);
  return secretFromSettings(data?.value, name);
}

async function writeSettingsSecret(name: string, encryptedValue: string, actorId: string): Promise<void> {
  const supabase = supabaseService();
  const { data, error: readError } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", FALLBACK_SETTINGS_KEY)
    .maybeSingle();
  if (readError) throw settingsStorageError(readError.message);

  const value = settingsSecretValue(data?.value);
  const { error } = await supabase.from("site_settings").upsert(
    {
      key: FALLBACK_SETTINGS_KEY,
      value: {
        ...value,
        secrets: {
          ...value.secrets,
          [name]: encryptedValue,
        },
        updatedAt: new Date().toISOString(),
      },
      updated_by: actorId,
    },
    { onConflict: "key" }
  );
  if (error) throw settingsStorageError(error.message);
}

async function removeSettingsSecret(name: string): Promise<void> {
  const supabase = supabaseService();
  const { data, error: readError } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", FALLBACK_SETTINGS_KEY)
    .maybeSingle();
  if (readError) {
    if (isRecoverableSecretStorageError(settingsStorageError(readError.message))) return;
    throw settingsStorageError(readError.message);
  }
  if (!data?.value) return;

  const value = settingsSecretValue(data.value);
  delete value.secrets[name];
  const { error } = await supabase.from("site_settings").upsert(
    {
      key: FALLBACK_SETTINGS_KEY,
      value: { ...value, updatedAt: new Date().toISOString() },
    },
    { onConflict: "key" }
  );
  if (error) throw settingsStorageError(error.message);
}

function encryptSecret(name: string, value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(aad(name), "utf8"));
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [ENCRYPTION_VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

function decryptSecret(name: string, payload: string): string {
  const [version, ivValue, tagValue, encryptedValue] = String(payload || "").split(":");
  if (version !== ENCRYPTION_VERSION || !ivValue || !tagValue || !encryptedValue) {
    throw new HttpError(503, "The stored Routera credential is invalid. Save it again from Admin.");
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
    decipher.setAAD(Buffer.from(aad(name), "utf8"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new HttpError(503, "The stored Routera credential could not be decrypted. Save it again from Admin.");
  }
}

function encryptionKey(): Buffer {
  return createHash("sha256")
    .update("diagnostica-online/platform-secrets/v1\0", "utf8")
    .update(serverEnvironment().supabaseServiceRoleKey, "utf8")
    .digest();
}

function aad(name: string): string {
  return `diagnostica-online:${name}:${ENCRYPTION_VERSION}`;
}

function credential(apiKey: string, source: RouteraCredential["source"]): RouteraCredential {
  return {
    apiKey,
    configured: Boolean(apiKey),
    source,
    suffix: apiKey ? apiKey.slice(-4) : "",
  };
}

function secretStorageError(message: string): HttpError {
  if (/platform_secrets|schema cache|does not exist/i.test(message)) {
    return new HttpError(503, "The encrypted platform_secrets table is unavailable.");
  }
  return new HttpError(500, "The encrypted credential could not be stored.");
}

function settingsStorageError(message: string): HttpError {
  if (/site_settings|schema cache|does not exist/i.test(message)) {
    return new HttpError(503, "The database settings table is unavailable. Check the Supabase connection and base schema.");
  }
  return new HttpError(500, "The encrypted credential fallback could not be stored.");
}

function isRecoverableSecretStorageError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "");
  return /platform_secrets table is unavailable|platform_secrets|schema cache|does not exist/i.test(message);
}

function secretFromSettings(value: unknown, name: string): string {
  const settings = settingsSecretValue(value);
  return String(settings.secrets[name] || "");
}

function settingsSecretValue(value: unknown): { secrets: Record<string, string>; updatedAt?: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { secrets: {} };
  const record = value as Record<string, unknown>;
  const rawSecrets = record.secrets;
  const secrets =
    rawSecrets && typeof rawSecrets === "object" && !Array.isArray(rawSecrets)
      ? Object.fromEntries(
          Object.entries(rawSecrets as Record<string, unknown>)
            .filter(([, secret]) => typeof secret === "string")
            .map(([key, secret]) => [key, secret as string])
        )
      : {};
  return {
    secrets,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : undefined,
  };
}
