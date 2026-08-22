import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "@/lib/platform/http";

type AccountEmailKind = "signup" | "recovery";

interface RateLimitReservation {
  id: string | null;
  persistent: boolean;
}

const EMAIL_WINDOW_MS = 15 * 60 * 1000;
const IP_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_LIMIT = 3;
const IP_LIMIT = 10;
const memoryAttempts = new Map<string, number[]>();

export async function reserveAccountEmail(
  supabase: SupabaseClient,
  request: Request,
  email: string,
  kind: AccountEmailKind
): Promise<RateLimitReservation> {
  const pepper = process.env.EMAIL_RATE_LIMIT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "diagnostica-email-limit";
  const recipientHash = fingerprint(pepper, `email:${email}`);
  const ip = clientIp(request);
  const ipHash = ip ? fingerprint(pepper, `ip:${ip}`) : null;
  const emailSince = new Date(Date.now() - EMAIL_WINDOW_MS).toISOString();
  const ipSince = new Date(Date.now() - IP_WINDOW_MS).toISOString();

  const atomic = await supabase.rpc("reserve_auth_email_request", {
    p_kind: kind,
    p_recipient_hash: recipientHash,
    p_ip_hash: ipHash,
    p_email_limit: EMAIL_LIMIT,
    p_ip_limit: IP_LIMIT,
  });
  if (!atomic.error && atomic.data) {
    void cleanupOldRequests(supabase);
    return { id: String(atomic.data), persistent: true };
  }
  if (atomic.error && /too many email requests/i.test(atomic.error.message || "")) {
    throw new HttpError(429, "Too many email requests. Wait a few minutes and try again.");
  }
  if (atomic.error && !isMissingFunction(atomic.error)) {
    throw new HttpError(503, "Account email protection is temporarily unavailable.");
  }

  const [emailResult, ipResult] = await Promise.all([
    supabase
      .from("auth_email_requests")
      .select("id", { count: "exact", head: true })
      .eq("kind", kind)
      .eq("recipient_hash", recipientHash)
      .gte("created_at", emailSince),
    ipHash
      ? supabase
          .from("auth_email_requests")
          .select("id", { count: "exact", head: true })
          .eq("kind", kind)
          .eq("ip_hash", ipHash)
          .gte("created_at", ipSince)
      : Promise.resolve({ count: 0, error: null }),
  ]);

  const schemaMissing = isMissingRelation(emailResult.error) || isMissingRelation(ipResult.error);
  if (schemaMissing) return reserveInMemory(recipientHash, ipHash, kind);
  if (emailResult.error || ipResult.error) throw new HttpError(503, "Account email protection is temporarily unavailable.");

  if ((emailResult.count || 0) >= EMAIL_LIMIT || (ipResult.count || 0) >= IP_LIMIT) {
    throw new HttpError(429, "Too many email requests. Wait a few minutes and try again.");
  }

  const { data, error } = await supabase
    .from("auth_email_requests")
    .insert({ kind, recipient_hash: recipientHash, ip_hash: ipHash, outcome: "accepted" })
    .select("id")
    .single();
  if (error) {
    if (isMissingRelation(error)) return reserveInMemory(recipientHash, ipHash, kind);
    throw new HttpError(503, "Account email protection is temporarily unavailable.");
  }

  void cleanupOldRequests(supabase);
  return { id: data.id, persistent: true };
}

export async function finishAccountEmail(
  supabase: SupabaseClient,
  reservation: RateLimitReservation,
  outcome: "sent" | "ignored" | "failed",
  providerMessageId?: string | null
): Promise<void> {
  if (!reservation.persistent || !reservation.id) return;
  await supabase
    .from("auth_email_requests")
    .update({ outcome, provider_message_id: providerMessageId || null })
    .eq("id", reservation.id);
}

function reserveInMemory(recipientHash: string, ipHash: string | null, kind: AccountEmailKind): RateLimitReservation {
  const now = Date.now();
  const emailKey = `${kind}:email:${recipientHash}`;
  const ipKey = ipHash ? `${kind}:ip:${ipHash}` : "";
  if (countRecent(emailKey, EMAIL_WINDOW_MS, now) >= EMAIL_LIMIT || (ipKey && countRecent(ipKey, IP_WINDOW_MS, now) >= IP_LIMIT)) {
    throw new HttpError(429, "Too many email requests. Wait a few minutes and try again.");
  }
  remember(emailKey, now);
  if (ipKey) remember(ipKey, now);
  return { id: null, persistent: false };
}

function countRecent(key: string, windowMs: number, now: number): number {
  const recent = (memoryAttempts.get(key) || []).filter((timestamp) => timestamp >= now - windowMs);
  memoryAttempts.set(key, recent);
  return recent.length;
}

function remember(key: string, now: number): void {
  memoryAttempts.set(key, [...(memoryAttempts.get(key) || []), now]);
}

function fingerprint(pepper: string, value: string): string {
  return createHash("sha256").update(pepper).update("\0").update(value).digest("hex");
}

function clientIp(request: Request): string {
  const value = request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "";
  return value.split(",")[0].trim().slice(0, 80);
}

function isMissingRelation(error: { code?: string | null } | null): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

function isMissingFunction(error: { code?: string | null; message?: string | null }): boolean {
  return error.code === "42883" || error.code === "PGRST202" || /reserve_auth_email_request/i.test(error.message || "");
}

async function cleanupOldRequests(supabase: SupabaseClient): Promise<void> {
  if (Math.random() > 0.02) return;
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from("auth_email_requests").delete().lt("created_at", cutoff);
}
