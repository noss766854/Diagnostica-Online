import { requireActiveUser } from "@/lib/platform/auth";
import { errorResponse, HttpError, json } from "@/lib/platform/http";
import { canonicalSiteOrigin } from "@/lib/platform/site-url";
import { stripeRequest } from "@/lib/platform/stripe";
import { supabaseService } from "@/lib/platform/supabase";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requireActiveUser(request);
    if (context.profile.role === "admin" || context.plan.plan_tier === "admin") {
      throw new HttpError(409, "Admin accounts already have unlimited access.");
    }
    const priceId = (process.env.STRIPE_PREMIUM_PRICE_ID || "").trim();
    if (!/^price_[A-Za-z0-9]+$/.test(priceId)) {
      throw new HttpError(503, "Premium billing is not configured. Add STRIPE_PREMIUM_PRICE_ID in Vercel.");
    }

    const supabase = supabaseService();
    const { data: plan } = await supabase
      .from("user_plans")
      .select("provider_customer_id,provider_subscription_id,plan_tier,status")
      .eq("user_id", context.user.id)
      .maybeSingle();
    const siteUrl = canonicalSiteOrigin(request);
    if (plan?.provider_subscription_id && plan?.provider_customer_id && plan.status !== "canceled") {
      const portalParams = new URLSearchParams();
      portalParams.set("customer", plan.provider_customer_id);
      portalParams.set("return_url", siteUrl);
      const portal = await stripeRequest<{ url?: string }>("billing_portal/sessions", { params: portalParams });
      if (!portal.url) throw new HttpError(502, "Stripe did not return a billing portal URL.");
      return json({ url: portal.url });
    }

    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("success_url", `${siteUrl}/?billing=success`);
    params.set("cancel_url", `${siteUrl}/?billing=cancelled`);
    params.set("client_reference_id", context.user.id);
    params.set("metadata[kind]", "premium_subscription");
    params.set("metadata[userId]", context.user.id);
    params.set("subscription_data[metadata][kind]", "premium_subscription");
    params.set("subscription_data[metadata][userId]", context.user.id);
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", "1");
    params.set("allow_promotion_codes", "true");
    if (plan?.provider_customer_id) params.set("customer", plan.provider_customer_id);
    else if (context.user.email) params.set("customer_email", context.user.email);

    const session = await stripeRequest<{ id: string; url?: string }>("checkout/sessions", { params });
    if (!session.url) throw new HttpError(502, "Stripe did not return a Premium checkout URL.");
    return json({ url: session.url });
  } catch (error) {
    return errorResponse(error, "Premium checkout could not be started.");
  }
}
