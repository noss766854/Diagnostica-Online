import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

import { serverEnvironment } from "@/lib/platform/env";
import { HttpError } from "@/lib/platform/http";
import { isRouteraApiKey } from "@/lib/platform/routera";
import { supabaseService } from "@/lib/platform/supabase";

const ROUTERA_SECRET_NAME = "routera_api_key";
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
    if (!isMissingSecretSchema(error)) throw error;
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
  const supabase = supabaseService();
  const { error } = await supabase.from("platform_secrets").upsert(
    {
      key: ROUTERA_SECRET_NAME,
      encrypted_value: encryptSecret(ROUTERA_SECRET_NAME, normalized),
      updated_by: actorId,
    },
    { onConflict: "key" }
  );
  if (error) throw secretStorageError(error.message);
  return credential(normalized, "admin");
}

export async function removeRouteraCredential(): Promise<RouteraCredential> {
  const supabase = supabaseService();
  const { error } = await supabase.from("platform_secrets").delete().eq("key", ROUTERA_SECRET_NAME);
  if (error) throw secretStorageError(error.message);
  const fallback = serverEnvironment().routeraApiKey;
  return isRouteraApiKey(fallback) ? credential(fallback, "vercel") : credential("", "none");
}

async function readEncryptedSecret(name: string): Promise<string> {
  const { data, error } = await supabaseService()
    .from("platform_secrets")
    .select("encrypted_value")
    .eq("key", name)
    .maybeSingle();
  if (error) throw secretStorageError(error.message);
  return String(data?.encrypted_value || "");
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
    return new HttpError(503, "Run the latest supabase-schema.sql before saving server credentials in Admin.");
  }
  return new HttpError(500, "The encrypted credential could not be stored.");
}

function isMissingSecretSchema(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "");
  return /platform_secrets|schema cache|does not exist|supabase-schema/i.test(message);
}
