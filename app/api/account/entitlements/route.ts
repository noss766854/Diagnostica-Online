import { requireUser } from "@/lib/platform/auth";
import { getEntitlements } from "@/lib/platform/entitlements";
import { errorResponse, json } from "@/lib/platform/http";
import { supabaseService } from "@/lib/platform/supabase";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const context = await requireUser(request);
    const entitlements = await getEntitlements(supabaseService(), context);
    return json({ entitlements });
  } catch (error) {
    return errorResponse(error, "Account limits could not be loaded.");
  }
}
