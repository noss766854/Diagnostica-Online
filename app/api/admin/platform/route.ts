import { requireAdmin } from "@/lib/platform/auth";
import { errorResponse, HttpError, json, readJson } from "@/lib/platform/http";
import { supabaseService } from "@/lib/platform/supabase";
import { adminPlatformActionSchema } from "@/lib/platform/validation";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const supabase = supabaseService();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [profiles, plans, cases, uploads, usage, tools, escalations] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,email,display_name,role,availability_status,mechanic_title,is_disabled,disabled_reason,created_at,updated_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("user_plans").select("user_id,plan_tier,status,ends_at,updated_at").limit(500),
      supabase
        .from("diagnostic_cases")
        .select("id,owner_id,title,status,priority,symptoms,dtc_codes,previous_work,assigned_mechanic_id,last_message_at,created_at,updated_at,vehicle:vehicles(make,model,year,engine,fuel_type,gearbox)")
        .order("updated_at", { ascending: false })
        .limit(250),
      supabase
        .from("diagnostic_uploads")
        .select("id,case_id,owner_id,file_name,mime_type,size_bytes,upload_kind,analysis_status,created_at")
        .order("created_at", { ascending: false })
        .limit(250),
      supabase
        .from("usage_events")
        .select("id,user_id,case_id,event_type,provider,model,input_tokens,output_tokens,estimated_cost_usd,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase.from("recommended_tools").select("*").order("priority", { ascending: true }).limit(250),
      supabase
        .from("diagnostic_messages")
        .select("case_id,metadata,created_at")
        .eq("sender_type", "assistant")
        .contains("metadata", { escalation_required: true })
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    const firstError = [profiles.error, plans.error, cases.error, uploads.error, usage.error, tools.error, escalations.error].find(Boolean);
    if (firstError) {
      throw new HttpError(500, `${firstError.message}. Run the latest supabase-schema.sql if these tables have not been created.`);
    }

    const usageRows = usage.data || [];
    const aiRows = usageRows.filter((row) => row.event_type === "ai_message");
    const escalationByCase = new Map<string, Record<string, unknown>>();
    (escalations.data || []).forEach((row) => {
      if (!escalationByCase.has(row.case_id)) {
        escalationByCase.set(row.case_id, {
          ...(row.metadata || {}),
          created_at: row.created_at,
        });
      }
    });
    const caseRows = (cases.data || []).map((diagnosticCase) => ({
      ...diagnosticCase,
      escalation: escalationByCase.get(diagnosticCase.id) || null,
    }));
    const usageSummary = {
      periodDays: 30,
      aiMessages: aiRows.length,
      inputTokens: aiRows.reduce((sum, row) => sum + Number(row.input_tokens || 0), 0),
      outputTokens: aiRows.reduce((sum, row) => sum + Number(row.output_tokens || 0), 0),
      estimatedCostUsd: Number(aiRows.reduce((sum, row) => sum + Number(row.estimated_cost_usd || 0), 0).toFixed(6)),
      uploads: usageRows.filter((row) => row.event_type === "upload").length,
      casesCreated: usageRows.filter((row) => row.event_type === "case_created").length,
      escalations: caseRows.filter((diagnosticCase) => ["waiting_for_mechanic", "assigned"].includes(diagnosticCase.status)).length,
    };

    return json({
      profiles: profiles.data || [],
      plans: plans.data || [],
      cases: caseRows,
      uploads: uploads.data || [],
      usage: usageRows,
      usageSummary,
      tools: tools.data || [],
    });
  } catch (error) {
    return errorResponse(error, "The admin platform data could not be loaded.");
  }
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const context = await requireAdmin(request);
    const supabase = supabaseService();
    const input = adminPlatformActionSchema.parse(await readJson(request));

    if (input.action === "update_user") {
      if (input.userId === context.user.id && (input.isDisabled || input.role !== "admin" || input.planTier !== "admin")) {
        throw new HttpError(400, "You cannot disable or demote the admin account currently in use.");
      }
      if (input.planTier === "admin" && input.role !== "admin") {
        throw new HttpError(400, "The admin plan requires the admin role.");
      }
      const disabledAt = input.isDisabled ? new Date().toISOString() : null;
      const [{ error: profileError }, { error: planError }] = await Promise.all([
        supabase
          .from("profiles")
          .update({
            role: input.role,
            is_disabled: input.isDisabled,
            disabled_reason: input.isDisabled ? input.disabledReason || "Disabled by administrator." : null,
            disabled_at: disabledAt,
          })
          .eq("id", input.userId),
        supabase.from("user_plans").upsert(
          {
            user_id: input.userId,
            plan_tier: input.role === "admin" ? "admin" : input.planTier,
            status: input.planStatus,
          },
          { onConflict: "user_id" }
        ),
      ]);
      if (profileError || planError) throw new HttpError(500, profileError?.message || planError?.message || "The user could not be updated.");
      await audit(supabase, context.user.id, "platform_user_updated", "profiles", input.userId, {
        role: input.role,
        planTier: input.planTier,
        planStatus: input.planStatus,
        isDisabled: input.isDisabled,
      });
      return json({ ok: true });
    }

    if (input.action === "update_case") {
      const { data: diagnosticCase, error: caseLookupError } = await supabase
        .from("diagnostic_cases")
        .select("id,owner_id")
        .eq("id", input.caseId)
        .maybeSingle();
      if (caseLookupError || !diagnosticCase) throw new HttpError(404, "Diagnostic case not found.");
      const now = new Date().toISOString();
      const assignedMechanicId = input.assignedMechanicId || null;
      const { error: caseError } = await supabase
        .from("diagnostic_cases")
        .update({
          status: input.reply ? "assigned" : input.status,
          priority: input.priority,
          assigned_mechanic_id: assignedMechanicId,
          last_message_at: input.reply ? now : undefined,
          closed_at: ["resolved", "archived"].includes(input.status) ? now : null,
        })
        .eq("id", input.caseId);
      if (caseError) throw new HttpError(500, caseError.message || "The diagnostic case could not be updated.");
      if (input.reply) {
        const { error: replyError } = await supabase.from("diagnostic_messages").insert({
          case_id: input.caseId,
          owner_id: diagnosticCase.owner_id,
          sender_type: "mechanic",
          content: input.reply,
          metadata: { admin_id: context.user.id, source: "admin_dashboard" },
        });
        if (replyError) throw new HttpError(500, replyError.message || "The mechanic reply could not be saved.");
        await supabase.from("usage_events").insert({
          user_id: diagnosticCase.owner_id,
          case_id: input.caseId,
          event_type: "mechanic_message",
          metadata: { admin_id: context.user.id },
        });
      }
      await audit(supabase, context.user.id, "diagnostic_case_updated", "diagnostic_cases", input.caseId, {
        status: input.status,
        priority: input.priority,
        assignedMechanicId,
        replied: Boolean(input.reply),
      });
      return json({ ok: true });
    }

    if (input.action === "upsert_tool") {
      const payload = {
        ...(input.toolId ? { id: input.toolId } : {}),
        name: input.name,
        category: input.category,
        description: input.description,
        affiliate_url: input.affiliateUrl,
        image_url: input.imageUrl || null,
        rule_tags: input.ruleTags,
        dtc_prefixes: input.dtcPrefixes,
        priority: input.priority,
        active: input.active,
        created_by: context.user.id,
      };
      const { data, error } = await supabase.from("recommended_tools").upsert(payload).select().single();
      if (error || !data) throw new HttpError(500, error?.message || "The recommended tool could not be saved.");
      await audit(supabase, context.user.id, "recommended_tool_saved", "recommended_tools", data.id, { name: input.name, active: input.active });
      return json({ tool: data });
    }

    const { data, error } = await supabase.from("recommended_tools").update({ active: false }).eq("id", input.toolId).select().single();
    if (error || !data) throw new HttpError(500, error?.message || "The recommended tool could not be disabled.");
    await audit(supabase, context.user.id, "recommended_tool_disabled", "recommended_tools", input.toolId, {});
    return json({ tool: data });
  } catch (error) {
    return errorResponse(error, "The admin update could not be completed.");
  }
}

async function audit(
  supabase: ReturnType<typeof supabaseService>,
  actorId: string,
  action: string,
  targetTable: string,
  targetId: string,
  metadata: Record<string, unknown>
): Promise<void> {
  await supabase.from("admin_audit_logs").insert({
    actor_id: actorId,
    action,
    target_table: targetTable,
    target_id: targetId,
    metadata,
  });
}
