import { requireAdmin } from "@/lib/platform/auth";
import { activePremiumPlans, billingSettingsFromContent } from "@/lib/platform/billing-settings";
import { errorResponse, json } from "@/lib/platform/http";
import { CANONICAL_SITE_URL } from "@/lib/platform/site-url";
import { resolveRouteraCredential } from "@/lib/platform/secrets";
import { supabaseService } from "@/lib/platform/supabase";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const supabase = supabaseService();
    const [{ data, error: settingsError }, { error: emailSchemaError }, { error: secretsSchemaError }, { error: diagnosticsSchemaError }] = await Promise.all([
      supabase.from("site_settings").select("value").eq("key", "public_content").maybeSingle(),
      supabase.from("auth_email_requests").select("id", { count: "exact", head: true }),
      supabase.from("platform_secrets").select("key", { count: "exact", head: true }),
      supabase.from("vehicles").select("id", { count: "exact", head: true }),
    ]);
    const content = data?.value && typeof data.value === "object" && !Array.isArray(data.value)
      ? data.value as Record<string, unknown>
      : {};
    const legalText = `${content.businessAddress || ""} ${content.refundText || content.refundPolicySummary || ""}`;
    const legalReady = Boolean(content.businessAddress && (content.refundText || content.refundPolicySummary) && !/add your|not configured|placeholder/i.test(legalText));
    const provider = aiProvider();
    const routeraCredential = provider === "routera" ? await resolveRouteraCredential() : null;
    const aiReady = provider === "openai" ? Boolean(process.env.OPENAI_API_KEY) : Boolean(routeraCredential?.configured);
    const configuredSite = normalizeOrigin(process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "");
    const adsClient = cleanAdsenseClient(process.env.NEXT_PUBLIC_ADSENSE_CLIENT || content.adsClient);
    const adSlots = content.adSlots && typeof content.adSlots === "object" ? content.adSlots as Record<string, unknown> : {};
    const hasAdSlot = Boolean(process.env.NEXT_PUBLIC_ADSENSE_SLOT || content.adsSlot || Object.values(adSlots).some(Boolean));
    const adDisclosureText = `${content.privacyText || ""} ${content.cookieText || ""}`;
    const adDisclosureReady = /google adsense/i.test(adDisclosureText) && /consent/i.test(adDisclosureText);
    const billingSettings = billingSettingsFromContent(content, process.env.STRIPE_PREMIUM_PRICE_ID || "");
    const premiumBillingReady = activePremiumPlans(billingSettings).length > 0;

    return json({
      items: [
        envItem("Supabase URL", Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL), "Vercel"),
        envItem("Supabase anon key", Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), "Vercel"),
        envItem("Supabase service role key", Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), "Vercel", true),
        envItem("Database connection", !settingsError, "Supabase"),
        envItem("Account email protection schema", !emailSchemaError, "Run latest supabase-schema.sql"),
        envItem("Dedicated encrypted secrets table", !secretsSchemaError, "Supabase schema", false, true),
        envItem("Full diagnostic tables", !diagnosticsSchemaError, "Supabase schema", false, true),
        envItem("Resend API key", Boolean(process.env.RESEND_API_KEY), "Vercel", true),
        envItem("Account email rate-limit secret", Boolean(process.env.EMAIL_RATE_LIMIT_SECRET), "Vercel", true, true),
        envItem("Canonical site URL", configuredSite === CANONICAL_SITE_URL, "Vercel"),
        envItem(
          `${providerLabel(provider)} API key`,
          aiReady,
          provider === "routera" && routeraCredential?.source === "admin" ? "Admin - Routera" : "Vercel",
          true
        ),
        envItem("AdSense publisher client", Boolean(adsClient), "Vercel or Admin - Ads"),
        envItem("AdSense ad unit slot", hasAdSlot, "Admin - Ads"),
        envItem("ads.txt publisher line", Boolean(adsClient), "/ads.txt"),
        envItem("Ad consent gate", content.consentEnabled !== false, "Admin - Legal content"),
        envItem("AdSense legal disclosure", adDisclosureReady, "Admin - Legal content"),
        envItem("Stripe secret key", Boolean(process.env.STRIPE_SECRET_KEY), "Vercel", true),
        envItem("Stripe webhook secret", Boolean(process.env.STRIPE_WEBHOOK_SECRET), "Vercel", true),
        envItem("Stripe Premium prices", premiumBillingReady, "Admin - Premium plans"),
        envItem("Paid-booking legal details", legalReady, "Admin - Legal content"),
      ],
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function aiProvider(): "routera" | "openai" {
  const provider = String(process.env.AI_PROVIDER || "routera").toLowerCase();
  return provider === "openai" ? "openai" : "routera";
}

function providerLabel(provider: "routera" | "openai"): string {
  if (provider === "openai") return "OpenAI";
  return "Routera";
}

function normalizeOrigin(value: string): string {
  try {
    return new URL(value).origin.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function cleanAdsenseClient(value: unknown): string {
  const match = String(value || "").match(/(?:ca-)?pub-\d{8,}/i);
  if (!match) return "";
  const client = match[0].toLowerCase();
  return client.startsWith("ca-") ? client : `ca-${client}`;
}

function envItem(label: string, configured: boolean, location: string, secret = false, optional = false) {
  return { label, configured, location, secret, optional };
}
