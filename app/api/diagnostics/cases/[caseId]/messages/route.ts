import { generateDiagnosticReply } from "@/lib/platform/ai";
import { requireActiveUser } from "@/lib/platform/auth";
import { loadCaseForUser } from "@/lib/platform/cases";
import { getEntitlements } from "@/lib/platform/entitlements";
import { serverEnvironment } from "@/lib/platform/env";
import { errorResponse, HttpError, json, readJson } from "@/lib/platform/http";
import { recommendationsForCase } from "@/lib/platform/recommendations";
import { supabaseService } from "@/lib/platform/supabase";
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
      throw new HttpError(409, "Reopen this case before sending another AI message.");
    }
    const input = diagnosticMessageSchema.parse(await readJson(request));
    const entitlements = await getEntitlements(supabase, context);
    if (!entitlements.canSendAiMessage) {
      throw new HttpError(429, `Your ${entitlements.plan} plan has reached its daily AI message limit. Your allowance resets at 00:00 UTC.`);
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
      const status = /daily ai message limit/i.test(claimError?.message || "") ? 429 : 403;
      throw new HttpError(status, claimError?.message || "AI usage could not be reserved.");
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
    if (historyError) throw new HttpError(500, "The case history could not be loaded for AI diagnosis.");

    const generation = await generateDiagnosticReply({
      diagnosticCase,
      messages: (history || []) as DiagnosticMessageRecord[],
      userMessage: input.content,
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
        metadata: { diagnostic_format: "mechanic_test_plan" },
      })
      .select()
      .single();
    if (assistantError || !assistantMessage) throw new HttpError(500, "The AI reply was generated but could not be saved.");

    const now = new Date().toISOString();
    await Promise.all([
      supabase
        .from("usage_events")
        .update({
          provider: generation.provider,
          model: generation.model,
          input_tokens: generation.inputTokens,
          output_tokens: generation.outputTokens,
          estimated_cost_usd: generation.estimatedCostUsd,
          metadata: { status: "completed" },
        })
        .eq("id", reservedUsageId),
      supabase
        .from("diagnostic_cases")
        .update({
          ai_summary: generation.text.slice(0, 4000),
          last_message_at: now,
          priority: safetyPriority(`${diagnosticCase.symptoms} ${input.content} ${generation.text}`),
        })
        .eq("id", caseId),
    ]);

    const updatedCase = { ...diagnosticCase, ai_summary: generation.text, last_message_at: now };
    const [refreshedEntitlements, recommendations] = await Promise.all([
      getEntitlements(supabase, context),
      recommendationsForCase(supabase, updatedCase),
    ]);
    return json({
      userMessage: userMessage as DiagnosticMessageRecord,
      assistantMessage: assistantMessage as DiagnosticMessageRecord,
      entitlements: refreshedEntitlements,
      recommendations,
    });
  } catch (error) {
    if (reservedUsageId) {
      try {
        await supabaseService().from("usage_events").delete().eq("id", reservedUsageId).contains("metadata", { status: "reserved" });
      } catch {
        // The original error is more useful than cleanup failure details.
      }
    }
    return errorResponse(error, "The AI diagnostic reply could not be generated.");
  }
}

function safetyPriority(text: string): "normal" | "urgent" {
  return /brake loss|no brakes|fuel leak|fuel smell|smoke|fire|oil pressure|steering loss|severe overheat|high voltage|battery fire/i.test(text)
    ? "urgent"
    : "normal";
}
