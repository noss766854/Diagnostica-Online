import type { User } from "@supabase/supabase-js";
import { HttpError } from "@/lib/platform/http";
import { bearerToken, supabaseService } from "@/lib/platform/supabase";
import type { PlanStatus, PlanTier, ProfileRole } from "@/types/diagnostics";

type RawProfile = Record<string, unknown> | null;
type RawPlan = Record<string, unknown> | null;

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
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_plans").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  if (profileError) throw profileLoadError(profileError.message);
  if (planError && !isMissingSchemaError(planError.message)) {
    throw new HttpError(500, "The account plan could not be loaded.");
  }

  const resolvedProfile = normalizeProfile(profile as RawProfile, user);
  const resolvedPlan = normalizePlan((planError ? null : plan) as RawPlan, resolvedProfile.role);

  if (!profile) {
    const { error } = await supabase.from("profiles").upsert(
      {
        id: resolvedProfile.id,
        email: resolvedProfile.email,
        role: resolvedProfile.role,
        display_name: resolvedProfile.display_name,
      },
      { onConflict: "id" }
    );
    if (error) throw profileLoadError(error.message);
  }
  if (!plan && !planError) {
    await supabase.from("user_plans").upsert(
      {
        user_id: user.id,
        plan_tier: resolvedPlan.plan_tier,
        status: resolvedPlan.status,
      },
      { onConflict: "user_id" }
    );
  }

  return {
    user,
    profile: resolvedProfile,
    plan: resolvedPlan,
  };
}

function normalizeProfile(profile: RawProfile, user: User): AuthContext["profile"] {
  const role = profileRole(profile?.role);
  return {
    id: user.id,
    email: typeof profile?.email === "string" && profile.email ? profile.email : user.email || null,
    role,
    display_name:
      typeof profile?.display_name === "string" && profile.display_name
        ? profile.display_name
        : user.user_metadata?.display_name || user.email?.split("@")[0] || "Driver",
    is_disabled: profile?.is_disabled === true,
    disabled_reason: typeof profile?.disabled_reason === "string" ? profile.disabled_reason : null,
  };
}

function normalizePlan(plan: RawPlan, role: ProfileRole): AuthContext["plan"] {
  return {
    plan_tier: planTier(plan?.plan_tier, role),
    status: planStatus(plan?.status),
    ends_at: typeof plan?.ends_at === "string" ? plan.ends_at : null,
  };
}

function profileRole(value: unknown): ProfileRole {
  return value === "mechanic" || value === "admin" ? value : "customer";
}

function planTier(value: unknown, role: ProfileRole): PlanTier {
  if (role === "admin") return "admin";
  return value === "premium" ? "premium" : "free";
}

function planStatus(value: unknown): PlanStatus {
  return value === "trialing" || value === "past_due" || value === "canceled" ? value : "active";
}

function profileLoadError(message: string): HttpError {
  if (isMissingSchemaError(message)) {
    return new HttpError(503, "Run the latest supabase-schema.sql so account profiles can be loaded.");
  }
  return new HttpError(500, "The account profile could not be loaded.");
}

function isMissingSchemaError(message: string): boolean {
  return /schema cache|does not exist|relation/i.test(message);
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
