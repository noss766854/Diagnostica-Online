import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_ADSENSE_CLIENT = "ca-pub-6817388263556075";
const GOOGLE_SELLER_ID = "f08c47fec0942fa0";

export async function GET(): Promise<Response> {
  const adsClient = await resolveAdsenseClient();
  const publisherId = adsClient.replace(/^ca-/, "");
  return new Response(`google.com, ${publisherId}, DIRECT, ${GOOGLE_SELLER_ID}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}

async function resolveAdsenseClient(): Promise<string> {
  const envClient = cleanAdsenseClient(process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "");
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceRoleKey) return envClient || DEFAULT_ADSENSE_CLIENT;

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    const { data, error } = await supabase.from("site_settings").select("value").eq("key", "public_content").maybeSingle();
    if (error) throw error;
    const content = data?.value && typeof data.value === "object" && !Array.isArray(data.value) ? data.value as Record<string, unknown> : {};
    return cleanAdsenseClient(content.adsClient) || envClient || DEFAULT_ADSENSE_CLIENT;
  } catch {
    return envClient || DEFAULT_ADSENSE_CLIENT;
  }
}

function cleanAdsenseClient(value: unknown): string {
  const text = String(value || "").trim();
  const match = text.match(/(?:ca-)?pub-\d{8,}/i);
  if (!match) return "";
  const client = match[0].toLowerCase();
  return client.startsWith("ca-") ? client : `ca-${client}`;
}
