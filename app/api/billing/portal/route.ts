import { requireActiveUser } from "@/lib/platform/auth";
import { errorResponse, HttpError, json } from "@/lib/platform/http";
import { canonicalSiteOrigin } from "@/lib/platform/site-url";
import { stripeRequest } from "@/lib/platform/stripe";
import { supabaseService } from "@/lib/platform/supabase";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requireActiveUser(request);
    const { data: plan, error } = await supabaseService()
      .from("user_plans")
      .select("provider_customer_id")
      .eq("user_id", context.user.id)
      .maybeSingle();
    if (error) throw new HttpError(500, "Billing details could not be loaded.");
    if (!plan?.provider_customer_id) throw new HttpError(404, "No Stripe billing account exists for this user yet.");

    const params = new URLSearchParams();
    params.set("customer", plan.provider_customer_id);
    params.set("return_url", `${canonicalSiteOrigin(request)}/premium`);
    const session = await stripeRequest<{ url?: string }>("billing_portal/sessions", { params });
    if (!session.url) throw new HttpError(502, "Stripe did not return a billing portal URL.");
    return json({ url: session.url });
  } catch (error) {
    return errorResponse(error, "The billing portal could not be opened.");
  }
}
