import { requireAdmin } from "@/lib/platform/auth";
import { errorResponse, json } from "@/lib/platform/http";
import { CANONICAL_SITE_URL } from "@/lib/platform/site-url";
import { resolveRouteraCredential } from "@/lib/platform/secrets";
import { supabaseService } from "@/lib/platform/supabase";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const supabase = supabaseService();
    const [{ data, error: settingsError }, { error: emailSchemaError }, { error: secretsSchemaError }] = await Promise.all([
      supabase.from("site_settings").select("value").eq("key", "public_content").maybeSingle(),
      supabase.from("auth_email_requests").select("id", { count: "exact", head: true }),
      supabase.from("platform_secrets").select("key", { count: "exact", head: true }),
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
    const adSlots = content.adSlots && typeof content.adSlots === "object" ? content.adSlots as Record<string, unknown> : {};
    const adsReady = Boolean((process.env.NEXT_PUBLIC_ADSENSE_CLIENT || content.adsClient) && (process.env.NEXT_PUBLIC_ADSENSE_SLOT || content.adsSlot || Object.values(adSlots).some(Boolean)));

    return json({
      items: [
        envItem("Supabase URL", Boolean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL), "Vercel"),
        envItem("Supabase anon key", Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), "Vercel"),
        envItem("Supabase service role key", Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), "Vercel", true),
        envItem("Database connection", !settingsError, "Supabase"),
        envItem("Account email protection schema", !emailSchemaError, "Run latest supabase-schema.sql"),
        envItem("Encrypted platform secrets schema", !secretsSchemaError, "Run latest supabase-schema.sql"),
        envItem("Resend API key", Boolean(process.env.RESEND_API_KEY), "Vercel", true),
        envItem("Account email rate-limit secret", Boolean(process.env.EMAIL_RATE_LIMIT_SECRET), "Vercel", true, true),
        envItem("Canonical site URL", configuredSite === CANONICAL_SITE_URL, "Vercel"),
        envItem(
          `${providerLabel(provider)} API key`,
          aiReady,
          provider === "routera" && routeraCredential?.source === "admin" ? "Admin - Routera" : "Vercel",
          true
        ),
        envItem("AdSense client and slot", adsReady, "Vercel and Admin - Ads"),
        envItem("Stripe secret key", Boolean(process.env.STRIPE_SECRET_KEY), "Vercel", true),
        envItem("Stripe webhook secret", Boolean(process.env.STRIPE_WEBHOOK_SECRET), "Vercel", true),
        envItem("Stripe Premium price", Boolean(process.env.STRIPE_PREMIUM_PRICE_ID), "Vercel"),
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

function envItem(label: string, configured: boolean, location: string, secret = false, optional = false) {
  return { label, configured, location, secret, optional };
}
