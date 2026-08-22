import { createClient } from "@supabase/supabase-js";
import { CANONICAL_SITE_URL } from "@/lib/platform/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  const siteUrl = process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
  const authentication = Boolean(supabaseUrl && serviceRoleKey && anonKey);
  const ai = provider === "openai" ? Boolean(process.env.OPENAI_API_KEY) : Boolean(process.env.GEMINI_API_KEY);
  const email = Boolean(process.env.RESEND_API_KEY && supabaseUrl && serviceRoleKey);
  const canonicalUrl = normalizeOrigin(siteUrl) === CANONICAL_SITE_URL;

  let database = false;
  let schema = false;
  let legal = false;
  let adsConfigured = Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT && process.env.NEXT_PUBLIC_ADSENSE_SLOT);

  if (supabaseUrl && serviceRoleKey) {
    const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const [settings, cases, usage, emailRequests, notificationDispatches] = await Promise.all([
      supabase.from("site_settings").select("value").eq("key", "public_content").maybeSingle(),
      supabase.from("diagnostic_cases").select("id", { count: "exact", head: true }),
      supabase.from("usage_events").select("id", { count: "exact", head: true }),
      supabase.from("auth_email_requests").select("id", { count: "exact", head: true }),
      supabase.from("notification_dispatches").select("id", { count: "exact", head: true }),
    ]);
    database = !settings.error;
    schema = !cases.error && !usage.error && !emailRequests.error && !notificationDispatches.error;
    const content = settings.data?.value && typeof settings.data.value === "object" && !Array.isArray(settings.data.value)
      ? settings.data.value as Record<string, unknown>
      : {};
    const legalText = `${content.businessAddress || ""} ${content.refundText || content.refundPolicySummary || ""}`;
    legal = Boolean(content.businessAddress && (content.refundText || content.refundPolicySummary) && !/add your|not configured|placeholder/i.test(legalText));
    adsConfigured = adsConfigured || Boolean(content.adsClient && (content.adsSlot || hasConfiguredAdSlot(content.adSlots)));
  }

  const payments = Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.STRIPE_PREMIUM_PRICE_ID &&
    legal
  );
  const requiredReady = authentication && database && schema && ai && email && canonicalUrl;

  return Response.json(
    {
      status: requiredReady ? "ok" : "degraded",
      checks: { authentication, database, schema, ai, email, canonicalUrl, payments, ads: adsConfigured, legal },
      timestamp: new Date().toISOString(),
    },
    { status: requiredReady ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}

function normalizeOrigin(value: string): string {
  try {
    return new URL(value).origin.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function hasConfiguredAdSlot(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && Object.values(value as Record<string, unknown>).some((slot) => String(slot || "").trim()));
}
