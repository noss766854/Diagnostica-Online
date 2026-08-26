import { requireActiveUser } from "@/lib/platform/auth";
import { loadBillingSettings, selectPremiumPlan } from "@/lib/platform/billing-settings";
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

    const supabase = supabaseService();
    const input = await optionalJson(request);
    const billingSettings = await loadBillingSettings(supabase);
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

    const selectedPlan = selectPremiumPlan(billingSettings, input.planKey);
    if (!selectedPlan) {
      throw new HttpError(503, "Premium billing is not configured. Add at least one active Stripe price ID in Admin.");
    }

    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("success_url", `${siteUrl}/?billing=success`);
    params.set("cancel_url", `${siteUrl}/?billing=cancelled`);
    params.set("client_reference_id", context.user.id);
    params.set("metadata[kind]", "premium_subscription");
    params.set("metadata[userId]", context.user.id);
    params.set("metadata[planKey]", selectedPlan.key);
    params.set("metadata[priceId]", selectedPlan.stripePriceId);
    params.set("subscription_data[metadata][kind]", "premium_subscription");
    params.set("subscription_data[metadata][userId]", context.user.id);
    params.set("subscription_data[metadata][planKey]", selectedPlan.key);
    params.set("subscription_data[metadata][priceId]", selectedPlan.stripePriceId);
    params.set("line_items[0][price]", selectedPlan.stripePriceId);
    params.set("line_items[0][quantity]", "1");
    params.set("allow_promotion_codes", "true");
    if (plan?.provider_customer_id) params.set("customer", plan.provider_customer_id);
    else if (context.user.email) params.set("customer_email", context.user.email);

    const session = await stripeRequest<{ id: string; url?: string }>("checkout/sessions", { params });
    if (!session.url) throw new HttpError(502, "Stripe did not return a Premium checkout URL.");
    return json({
      url: session.url,
      plan: {
        key: selectedPlan.key,
        label: selectedPlan.label,
        displayPrice: selectedPlan.displayPrice,
        interval: selectedPlan.interval,
      },
    });
  } catch (error) {
    return errorResponse(error, "Premium checkout could not be started.");
  }
}

async function optionalJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
  } catch {
    return {};
  }
}
