import { createHmac, timingSafeEqual } from "node:crypto";

import { HttpError } from "@/lib/platform/http";
import { resolveStripeCredential } from "@/lib/platform/secrets";

type StripeMethod = "GET" | "POST";

export async function stripeRequest<T extends Record<string, any>>(
  path: string,
  options: { method?: StripeMethod; params?: URLSearchParams } = {}
): Promise<T> {
  const { apiKey: secretKey } = await resolveStripeCredential("secretKey");
  if (!secretKey) throw new HttpError(503, "Stripe is not configured. Save the Stripe secret key in Admin > Stripe payments.");

  const method = options.method || "POST";
  const response = await fetch(`https://api.stripe.com/v1/${path.replace(/^\/+/, "")}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: method === "POST" ? options.params || new URLSearchParams() : undefined,
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new HttpError(response.status >= 500 ? 502 : response.status, data.error?.message || "Stripe rejected the request.");
  }
  return data;
}

export function verifyStripeWebhook(payload: string, signatureHeader: string, secret: string): void {
  if (!secret) throw new HttpError(503, "STRIPE_WEBHOOK_SECRET is not configured.");
  const values = signatureHeader.split(",").map((part) => part.trim());
  const timestamp = values.find((part) => part.startsWith("t="))?.slice(2) || "";
  const signatures = values.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds) || !signatures.length) throw new HttpError(400, "Stripe signature is malformed.");
  if (Math.abs(Date.now() / 1000 - timestampSeconds) > 300) throw new HttpError(400, "Stripe signature timestamp is outside the accepted window.");

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest();
  const valid = signatures.some((signature) => {
    if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
    const provided = Buffer.from(signature, "hex");
    return provided.length === expected.length && timingSafeEqual(provided, expected);
  });
  if (!valid) throw new HttpError(400, "Stripe signature verification failed.");
}

export function stripeId(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) return String((value as { id?: unknown }).id || "");
  return "";
}
