import { requireActiveUser } from "@/lib/platform/auth";
import { activePremiumPlans, loadBillingSettings } from "@/lib/platform/billing-settings";
import { getEntitlements } from "@/lib/platform/entitlements";
import { errorResponse, json } from "@/lib/platform/http";
import { supabaseService } from "@/lib/platform/supabase";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const context = await requireActiveUser(request);
    const supabase = supabaseService();
    const [{ data: plan }, entitlements] = await Promise.all([
      supabase
        .from("user_plans")
        .select("provider_customer_id,provider_subscription_id,plan_tier,status,ends_at")
        .eq("user_id", context.user.id)
        .maybeSingle(),
      getEntitlements(supabase, context),
    ]);
    const billingSettings = await loadBillingSettings(supabase);
    const activePlans = activePremiumPlans(billingSettings);

    return json({
      entitlements,
      billing: {
        hasCustomer: Boolean(plan?.provider_customer_id),
        hasSubscription: Boolean(plan?.provider_subscription_id),
        status: plan?.status || context.plan.status,
        priceConfigured: activePlans.length > 0,
      },
      plans: activePlans.map((premiumPlan) => ({
        key: premiumPlan.key,
        label: premiumPlan.label,
        description: premiumPlan.description,
        displayPrice: premiumPlan.displayPrice,
        interval: premiumPlan.interval,
        featured: premiumPlan.featured,
      })),
    });
  } catch (error) {
    return errorResponse(error, "Billing status could not be loaded.");
  }
}
