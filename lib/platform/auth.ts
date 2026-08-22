import type { User } from "@supabase/supabase-js";
import { HttpError } from "@/lib/platform/http";
import { bearerToken, supabaseService } from "@/lib/platform/supabase";
import type { PlanStatus, PlanTier, ProfileRole } from "@/types/diagnostics";

export interface AuthContext {
  user: User;
  profile: {
    id: string;
    email: string | null;
    role: ProfileRole;
    display_name: string | null;
    is_disabled: boolean;
    disabled_reason: string | null;
  };
  plan: {
    plan_tier: PlanTier;
    status: PlanStatus;
    ends_at: string | null;
  };
}

export async function requireUser(request: Request): Promise<AuthContext> {
  const token = bearerToken(request);
  if (!token) throw new HttpError(401, "Log in to continue.");

  const supabase = supabaseService();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) throw new HttpError(401, "Your login session is no longer valid.");

  const user = userData.user;
  const [{ data: profile, error: profileError }, { data: plan, error: planError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,role,display_name,is_disabled,disabled_reason")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("user_plans").select("plan_tier,status,ends_at").eq("user_id", user.id).maybeSingle(),
  ]);

  if (profileError) throw new HttpError(500, "The account profile could not be loaded.");
  if (planError) throw new HttpError(500, "The account plan could not be loaded.");

  const resolvedProfile = profile || {
    id: user.id,
    email: user.email || null,
    role: "customer",
    display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "Driver",
    is_disabled: false,
    disabled_reason: null,
  };
  const resolvedPlan = plan || { plan_tier: resolvedProfile.role === "admin" ? "admin" : "free", status: "active", ends_at: null };

  if (!profile) {
    await supabase.from("profiles").upsert(resolvedProfile, { onConflict: "id" });
  }
  if (!plan) {
    await supabase
      .from("user_plans")
      .upsert({ user_id: user.id, plan_tier: resolvedPlan.plan_tier, status: "active" }, { onConflict: "user_id" });
  }

  return {
    user,
    profile: resolvedProfile as AuthContext["profile"],
    plan: resolvedPlan as AuthContext["plan"],
  };
}

export async function requireActiveUser(request: Request): Promise<AuthContext> {
  const context = await requireUser(request);
  if (context.profile.is_disabled) {
    throw new HttpError(403, context.profile.disabled_reason || "This account has been disabled. Contact support if you believe this is an error.");
  }
  return context;
}

export async function requireAdmin(request: Request): Promise<AuthContext> {
  const context = await requireActiveUser(request);
  if (context.profile.role !== "admin") throw new HttpError(403, "Admin access is required.");
  return context;
}
