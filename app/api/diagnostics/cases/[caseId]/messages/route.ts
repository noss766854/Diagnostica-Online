import { generateDiagnosticReply } from "@/lib/platform/ai";
import { requireActiveUser } from "@/lib/platform/auth";
import { loadCaseForUser } from "@/lib/platform/cases";
import { getEntitlements } from "@/lib/platform/entitlements";
import { serverEnvironment } from "@/lib/platform/env";
import { errorResponse, HttpError, json, readJson } from "@/lib/platform/http";
import { recommendationsForCase } from "@/lib/platform/recommendations";
import { supabaseService } from "@/lib/platform/supabase";
import { loadDiagnosticAttachments } from "@/lib/platform/uploads";
import { diagnosticMessageSchema } from "@/lib/platform/validation";
import type { DiagnosticMessageRecord } from "@/types/diagnostics";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ caseId: string }>;
}

export async function POST(request: Request, { params }: RouteContext): Promise<Response> {
  let reservedUsageId = "";
  try {
    const { caseId } = await params;
    const context = await requireActiveUser(request);
    const supabase = supabaseService();
    const env = serverEnvironment();
    const diagnosticCase = await loadCaseForUser(supabase, context, caseId);
    if (["resolved", "archived"].includes(diagnosticCase.status)) {
      throw new HttpError(409, "Reopen this case before sending another diagnostic message.");
    }
    const input = diagnosticMessageSchema.parse(await readJson(request));
    if (["waiting_for_mechanic", "assigned"].includes(diagnosticCase.status)) {
      const now = new Date().toISOString();
      const { data: reviewMessage, error: reviewMessageError } = await supabase
        .from("diagnostic_messages")
        .insert({
          case_id: caseId,
          owner_id: context.user.id,
          sender_type: "user",
          content: input.content,
          metadata: { source: "human_review_follow_up" },
        })
        .select()
        .single();
      if (reviewMessageError || !reviewMessage) throw new HttpError(500, "Your message to the human reviewer could not be saved.");
      await supabase.from("diagnostic_cases").update({ last_message_at: now }).eq("id", caseId);
      return json({
        userMessage: reviewMessage as DiagnosticMessageRecord,
        assistantMessage: null,
        caseStatus: diagnosticCase.status,
        priority: diagnosticCase.priority,
        routing: {
          required: true,
          category: "specialist_judgment",
          reason: "This case is already queued for human review.",
        },
      });
    }
    const entitlements = await getEntitlements(supabase, context);
    if (!entitlements.canSendAiMessage) {
      throw new HttpError(429, `Your ${entitlements.plan} plan has reached its daily diagnostic message limit. Your allowance resets at 00:00 UTC.`);
    }

    const provider = env.aiProvider;
    const model = provider === "openai" ? env.openAiModel : env.geminiModel;
    const { data: usageId, error: claimError } = await supabase.rpc("claim_ai_message", {
      p_user_id: context.user.id,
      p_case_id: caseId,
      p_provider: provider,
      p_model: model,
      p_free_limit: env.freeAiMessagesPerDay,
      p_premium_limit: env.premiumAiMessagesPerDay,
    });
    if (claimError || !usageId) {
      const status = /daily (?:ai|diagnostic) message limit/i.test(claimError?.message || "") ? 429 : 403;
      throw new HttpError(status, claimError?.message || "Diagnostic usage could not be reserved.");
    }
    reservedUsageId = String(usageId);

    const { data: userMessage, error: userMessageError } = await supabase
      .from("diagnostic_messages")
      .insert({
        case_id: caseId,
        owner_id: context.user.id,
        sender_type: "user",
        content: input.content,
        metadata: { source: "diagnostic_chat" },
      })
      .select()
      .single();
    if (userMessageError || !userMessage) throw new HttpError(500, "Your diagnostic message could not be saved.");

    const { data: history, error: historyError } = await supabase
      .from("diagnostic_messages")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true })
      .limit(250);
    if (historyError) throw new HttpError(500, "The case history could not be loaded for diagnosis.");

    const [automation, attachments] = await Promise.all([
      loadAutomationConfig(supabase),
      loadDiagnosticAttachments(supabase, caseId),
    ]);
    const generation = await generateDiagnosticReply({
      diagnosticCase,
      messages: (history || []) as DiagnosticMessageRecord[],
      userMessage: input.content,
      automation,
      attachments,
    });
    const { data: assistantMessage, error: assistantError } = await supabase
      .from("diagnostic_messages")
      .insert({
        case_id: caseId,
        owner_id: context.user.id,
        sender_type: "assistant",
        content: generation.text,
        provider: generation.provider,
        model: generation.model,
        input_tokens: generation.inputTokens,
        output_tokens: generation.outputTokens,
        metadata: {
          diagnostic_format: "autonomous_test_plan",
          escalation_required: generation.escalation.required,
          escalation_category: generation.escalation.category,
          escalation_reason: generation.escalation.reason,
        },
      })
      .select()
      .single();
    if (assistantError || !assistantMessage) throw new HttpError(500, "The diagnostic reply was generated but could not be saved.");

    const now = new Date().toISOString();
    const priority = safetyPriority(`${diagnosticCase.symptoms} ${input.content} ${generation.text}`);
    const nextStatus: "waiting_for_mechanic" | "active" = generation.escalation.required ? "waiting_for_mechanic" : "active";
    await Promise.all([
      supabase
        .from("usage_events")
        .update({
          provider: generation.provider,
          model: generation.model,
          input_tokens: generation.inputTokens,
          output_tokens: generation.outputTokens,
          estimated_cost_usd: generation.estimatedCostUsd,
          metadata: {
            status: "completed",
            escalation_required: generation.escalation.required,
            escalation_category: generation.escalation.category,
          },
        })
        .eq("id", reservedUsageId),
      supabase
        .from("diagnostic_cases")
        .update({
          ai_summary: generation.text.slice(0, 4000),
          last_message_at: now,
          priority,
          status: nextStatus,
          assigned_mechanic_id: generation.escalation.required ? null : diagnosticCase.assigned_mechanic_id,
        })
        .eq("id", caseId),
    ]);

    const updatedCase = { ...diagnosticCase, ai_summary: generation.text, last_message_at: now, priority, status: nextStatus };
    const [refreshedEntitlements, recommendations] = await Promise.all([
      getEntitlements(supabase, context),
      recommendationsForCase(supabase, updatedCase),
    ]);
    return json({
      userMessage: userMessage as DiagnosticMessageRecord,
      assistantMessage: assistantMessage as DiagnosticMessageRecord,
      entitlements: refreshedEntitlements,
      recommendations,
      routing: generation.escalation,
      caseStatus: nextStatus,
      priority,
    });
  } catch (error) {
    if (reservedUsageId) {
      try {
        await supabaseService().from("usage_events").delete().eq("id", reservedUsageId).contains("metadata", { status: "reserved" });
      } catch {
        // The original error is more useful than cleanup failure details.
      }
    }
    return errorResponse(error, "The diagnostic reply could not be generated.");
  }
}

async function loadAutomationConfig(supabase: ReturnType<typeof supabaseService>): Promise<{
  autonomousMode: boolean;
  systemPrompt: string;
  escalationPolicy: string;
  escalationCustomerMessage: string;
}> {
  const { data } = await supabase.from("site_settings").select("value").eq("key", "public_content").maybeSingle();
  const value = data?.value && typeof data.value === "object" ? (data.value as Record<string, unknown>) : {};
  return {
    autonomousMode: value.autonomousMode !== false && value.autonomousMode !== "false",
    systemPrompt: cleanSetting(value.systemPrompt, ""),
    escalationPolicy: cleanSetting(
      value.escalationPolicy,
      "Escalate only after the AI has used the available vehicle details and reasonable remote tests and still needs human judgment. Do not escalate merely because more information or another test is needed."
    ),
    escalationCustomerMessage: cleanSetting(
      value.escalationCustomerMessage,
      "This case needs a human review before I can guide you further safely. I have sent only the relevant case details to the review queue."
    ),
  };
}

function cleanSetting(value: unknown, fallback: string): string {
  const cleaned = String(value || "").trim().slice(0, 3000);
  return cleaned || fallback;
}

function safetyPriority(text: string): "normal" | "urgent" {
  return /brake loss|no brakes|fuel leak|fuel smell|smoke|fire|oil pressure|steering loss|severe overheat|high voltage|battery fire/i.test(text)
    ? "urgent"
    : "normal";
}
