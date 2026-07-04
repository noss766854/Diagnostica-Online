import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET(request) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  let adminClient = null;
  if (supabaseUrl && serviceRoleKey) {
    const authResult = await requireAdmin(request, supabaseUrl, serviceRoleKey);
    if (!authResult.ok) {
      return json({ error: authResult.error }, authResult.status);
    }
    adminClient = authResult.supabase;
  }

  let legalReady = false;
  if (adminClient) {
    const { data } = await adminClient.from("site_settings").select("value").eq("key", "public_content").maybeSingle();
    const content = data?.value && typeof data.value === "object" ? data.value : {};
    const legalText = `${content.businessAddress || ""} ${content.refundText || content.refundPolicySummary || ""}`;
    legalReady = Boolean(content.businessAddress && (content.refundText || content.refundPolicySummary) && !/add your|not configured|placeholder/i.test(legalText));
  }

  return json({
    items: [
      envItem("Supabase URL", Boolean(supabaseUrl), "Vercel"),
      envItem("Supabase anon key", Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), "Vercel"),
      envItem("Supabase service role key", Boolean(serviceRoleKey), "Vercel", true),
      envItem("Resend API key", Boolean(process.env.RESEND_API_KEY), "Vercel", true),
      envItem("Public site URL", Boolean(process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL), "Vercel"),
      envItem("Gemini API key", Boolean(process.env.GEMINI_API_KEY), "Vercel", true),
      envItem("OpenAI API key", Boolean(process.env.OPENAI_API_KEY), "Vercel", true),
      envItem("AI provider", Boolean(process.env.AI_PROVIDER || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY), process.env.AI_PROVIDER || "Gemini default"),
      envItem("Stripe secret key", Boolean(process.env.STRIPE_SECRET_KEY), "Vercel", true),
      envItem("Stripe webhook secret", Boolean(process.env.STRIPE_WEBHOOK_SECRET), "Vercel", true),
      envItem("Stripe Premium price", Boolean(process.env.STRIPE_PREMIUM_PRICE_ID), "Vercel"),
      envItem("Paid-booking legal details", legalReady, "Admin - Legal content"),
    ],
  });
}

async function requireAdmin(request, supabaseUrl, serviceRoleKey) {
  const token = bearerToken(request.headers.get("authorization") || "");
  if (!token) {
    return { ok: false, status: 401, error: "Admin session is required." };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return { ok: false, status: 401, error: "Admin session could not be verified." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    return { ok: false, status: 403, error: "Admin role is required." };
  }

  return { ok: true, supabase };
}

function bearerToken(value) {
  const match = String(value).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function envItem(label, configured, location, secret = false) {
  return {
    label,
    configured,
    location,
    secret,
  };
}

function json(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
