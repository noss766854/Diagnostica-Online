import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_ADSENSE_CLIENT = "ca-pub-6817388263556075";

export async function GET(): Promise<Response> {
  const content = await loadPublicContent();
  return Response.json(
    {
      adsClient: cleanAdsClient(content.adsClient) || cleanAdsClient(process.env.NEXT_PUBLIC_ADSENSE_CLIENT) || DEFAULT_ADSENSE_CLIENT,
      adsSlot: cleanAdSlot(content.adsSlot) || cleanAdSlot(process.env.NEXT_PUBLIC_ADSENSE_SLOT),
      adSlots: cleanAdSlots(content.adSlots),
      consentEnabled: content.consentEnabled !== false,
      consentTitle: cleanText(content.consentTitle, "Cookie and ad consent", 120),
      consentBody: cleanText(
        content.consentBody,
        "We use essential storage for site preferences. With your consent, we also use ads on free content pages.",
        280
      ),
      consentAcceptText: cleanText(content.consentAcceptText, "Accept ads", 60),
      consentRejectText: cleanText(content.consentRejectText, "Essential only", 60),
    },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } }
  );
}

async function loadPublicContent(): Promise<Record<string, unknown>> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceRoleKey) return {};

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data, error } = await supabase.from("site_settings").select("value").eq("key", "public_content").maybeSingle();
    if (error) throw error;
    return data?.value && typeof data.value === "object" && !Array.isArray(data.value) ? data.value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function cleanAdSlots(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, slot]) => [key, cleanAdSlot(slot)] as const)
      .filter(([, slot]) => Boolean(slot))
  );
}

function cleanAdSlot(value: unknown): string {
  const text = String(value || "").trim();
  return /^\d{5,24}$/.test(text) ? text : "";
}

function cleanAdsClient(value: unknown): string {
  const match = String(value || "").match(/(?:ca-)?pub-\d{8,}/i);
  if (!match) return "";
  const client = match[0].toLowerCase();
  return client.startsWith("ca-") ? client : `ca-${client}`;
}

function cleanText(value: unknown, fallback: string, maxLength: number): string {
  const text = String(value || "").replace(/[\r\n]+/g, " ").trim().slice(0, maxLength);
  return text || fallback;
}
