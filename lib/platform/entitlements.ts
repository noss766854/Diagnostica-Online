import type { SupabaseClient } from "@supabase/supabase-js";
import { serverEnvironment } from "@/lib/platform/env";
import type { AuthContext } from "@/lib/platform/auth";
import type { Entitlements, PlanTier } from "@/types/diagnostics";

export async function getEntitlements(supabase: SupabaseClient, context: AuthContext): Promise<Entitlements> {
  const env = serverEnvironment();
  const isAdmin = context.profile.role === "admin" || context.plan.plan_tier === "admin";
  const planNotExpired = !context.plan.ends_at || new Date(context.plan.ends_at).getTime() > Date.now();
  const activePlan = (context.plan.status === "active" || context.plan.status === "trialing") && planNotExpired;
  const plan: PlanTier = isAdmin ? "admin" : activePlan && context.plan.plan_tier === "premium" ? "premium" : "free";
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [{ count: aiCount }, { count: caseCount }] = await Promise.all([
    supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.user.id)
      .eq("event_type", "ai_message")
      .gte("created_at", startOfDay.toISOString()),
    supabase
      .from("diagnostic_cases")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", context.user.id)
      .in("status", ["active", "waiting_for_mechanic", "assigned"]),
  ]);

  const aiMessagesUsedToday = aiCount || 0;
  const activeCases = caseCount || 0;
  const aiMessagesDailyLimit = plan === "admin" ? null : plan === "premium" ? env.premiumAiMessagesPerDay : env.freeAiMessagesPerDay;
  const activeCaseLimit = plan === "admin" ? null : plan === "premium" ? 25 : 3;
  const isDisabled = context.profile.is_disabled;

  return {
    plan,
    status: context.plan.status,
    isAdmin,
    isDisabled,
    showAds: plan === "free" && !isDisabled,
    aiMessagesUsedToday,
    aiMessagesDailyLimit,
    activeCases,
    activeCaseLimit,
    canSendAiMessage: !isDisabled && (aiMessagesDailyLimit === null || aiMessagesUsedToday < aiMessagesDailyLimit),
    canCreateCase: !isDisabled && (activeCaseLimit === null || activeCases < activeCaseLimit),
  };
}
