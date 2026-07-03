import { HttpError } from "@/lib/platform/http";
import { serverEnvironment } from "@/lib/platform/env";
import type { AiGenerationResult, DiagnosticCaseRecord, DiagnosticMessageRecord, EscalationCategory } from "@/types/diagnostics";

interface AutomationConfig {
  autonomousMode?: boolean;
  systemPrompt?: string;
  escalationPolicy?: string;
  escalationCustomerMessage?: string;
}

interface GenerateInput {
  diagnosticCase: DiagnosticCaseRecord;
  messages: DiagnosticMessageRecord[];
  userMessage: string;
  automation?: AutomationConfig;
}

const ROUTING_MARKER = "DIAGNOSTICA_ROUTING";

const SYSTEM_PROMPT = [
  "You are DiagnosticaOnline AI, an experienced automotive diagnostic assistant.",
  "Work like a diagnostic mechanic: reason from symptoms and test results, not from parts swapping.",
  "Give a concise ranked list of likely causes, then a safe test order. For each test, state the expected value or observation only when it is broadly reliable, and explain what pass/fail results mean.",
  "Ask for missing vehicle details or one useful next observation when needed.",
  "Use these headings when enough context exists: Likely causes, Test order, What the results mean, Safety, Next question.",
  "Do not invent manufacturer-specific specifications. Tell the user to consult factory service information when an exact specification varies by engine or model.",
  "Do not tell the user to replace a part without a confirming test unless an immediate safety action is required.",
  "Clearly warn against driving when symptoms indicate brake, steering, fuel, fire, high-voltage, severe overheating, oil-pressure, or other immediate danger.",
  "Refuse instructions for emissions defeat or tampering, immobilizer bypass, odometer fraud, theft enablement, or unsafe bypasses. You may help with lawful diagnostics, emissions-system repair, key programming with proof of ownership, and restoring original or factory software.",
  "ECU binary uploads are storage-only in this version. Do not claim to have inspected binary ECU contents.",
  "Remote guidance is informational and does not replace an in-person inspection by a qualified mechanic.",
  "You own the diagnostic conversation. Do not hand a normal case to a human, advertise live calls, or stop after intake. Continue asking for observations, proposing tests, and interpreting results until the user has a useful conclusion or next action.",
  "Escalate to a human reviewer only when human judgment is genuinely required and the AI cannot safely or reliably make further progress. Missing ordinary details, a need for another test, or low initial confidence are not reasons to escalate.",
  "Even when escalating, provide the safest useful guidance you can and do not expose internal routing notes.",
  `End every reply with exactly one private routing line in this format: [[${ROUTING_MARKER} {"required":false,"category":"none","reason":""}]].`,
  "When escalation is necessary, set required to true, choose one category from ambiguous_evidence, specialist_judgment, unsupported_input, or safety_review, and give a short internal reason. Never mention this routing line in the customer-facing reply.",
].join("\n");

export async function generateDiagnosticReply(input: GenerateInput): Promise<AiGenerationResult> {
  const env = serverEnvironment();
  if (env.aiProvider === "openai") return generateWithOpenAi(input);
  return generateWithGemini(input);
}

async function generateWithGemini(input: GenerateInput): Promise<AiGenerationResult> {
  const env = serverEnvironment();
  if (!env.geminiApiKey) throw new HttpError(503, "Gemini is not configured. Add GEMINI_API_KEY in Vercel.");
  const model = cleanModel(env.geminiModel, "gemini-2.5-flash");
  const contents = conversationForProvider(input);
  const response = await fetch(
    `${env.geminiApiBaseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.geminiApiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt(input) }] },
        contents: contents.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 1400,
        },
      }),
    }
  );
  const data = (await response.json().catch(() => ({}))) as Record<string, any>;
  if (!response.ok) throw new HttpError(response.status >= 500 ? 502 : 400, data.error?.message || "Gemini could not generate a diagnostic reply.");

  const rawText = String(
    data.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || "")
      .join("") || ""
  ).trim();
  const parsed = applyEscalationMessage(enforceEscalationPolicy(parseDiagnosticOutput(rawText), input), input.automation);
  if (!parsed.text) throw new HttpError(502, "Gemini returned an empty diagnostic reply.");
  const inputTokens = numberOrEstimate(data.usageMetadata?.promptTokenCount, providerInputText(contents, input.diagnosticCase));
  const outputTokens = numberOrEstimate(data.usageMetadata?.candidatesTokenCount, rawText);
  return resultWithCost({ ...parsed, provider: "gemini", model, inputTokens, outputTokens });
}

async function generateWithOpenAi(input: GenerateInput): Promise<AiGenerationResult> {
  const env = serverEnvironment();
  if (!env.openAiApiKey) throw new HttpError(503, "OpenAI is not configured. Add OPENAI_API_KEY in Vercel.");
  const model = cleanModel(env.openAiModel, "gpt-4.1-mini");
  const contents = conversationForProvider(input);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: systemPrompt(input),
      input: contents.map((message) => ({
        role: message.role,
        content: [{ type: "input_text", text: message.content }],
      })),
      temperature: 0.25,
      max_output_tokens: 1400,
    }),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, any>;
  if (!response.ok) throw new HttpError(response.status >= 500 ? 502 : 400, data.error?.message || "OpenAI could not generate a diagnostic reply.");
  const rawText = extractOpenAiText(data);
  const parsed = applyEscalationMessage(enforceEscalationPolicy(parseDiagnosticOutput(rawText), input), input.automation);
  if (!parsed.text) throw new HttpError(502, "OpenAI returned an empty diagnostic reply.");
  const inputTokens = numberOrEstimate(data.usage?.input_tokens, providerInputText(contents, input.diagnosticCase));
  const outputTokens = numberOrEstimate(data.usage?.output_tokens, rawText);
  return resultWithCost({ ...parsed, provider: "openai", model, inputTokens, outputTokens });
}

function systemPrompt(input: GenerateInput): string {
  const { diagnosticCase } = input;
  const vehicle = diagnosticCase.vehicle;
  const context = [
    vehicle ? `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}; engine/powertrain: ${vehicle.engine}; fuel: ${vehicle.fuel_type}; gearbox: ${vehicle.gearbox}.` : "Vehicle details are incomplete.",
    vehicle?.vin ? `VIN supplied: ${vehicle.vin}.` : "VIN not supplied.",
    vehicle?.ecu ? `ECU identifier supplied: ${vehicle.ecu}.` : "ECU identifier not supplied.",
    `Symptoms: ${diagnosticCase.symptoms}`,
    diagnosticCase.dtc_codes.length ? `DTC codes: ${diagnosticCase.dtc_codes.join(", ")}.` : "No DTC codes supplied.",
    diagnosticCase.previous_work ? `Previous repairs/tests: ${diagnosticCase.previous_work}` : "No previous repairs or tests supplied.",
  ].join("\n");
  const automationPolicy = cleanInstruction(input.automation?.escalationPolicy);
  const adminInstructions = cleanInstruction(input.automation?.systemPrompt);
  const customerMessage = cleanInstruction(input.automation?.escalationCustomerMessage);
  const operatingMode = input.automation?.autonomousMode === false
    ? "Autonomous mode is disabled, but still complete as much diagnosis as possible before requesting human review."
    : "Autonomous mode is enabled. The AI must handle the case end to end unless the escalation policy is met.";
  return [
    SYSTEM_PROMPT,
    adminInstructions ? `Admin-configured diagnostic instructions: ${adminInstructions}` : "",
    operatingMode,
    automationPolicy ? `Admin escalation policy: ${automationPolicy}` : "",
    customerMessage ? `If escalation is required, include this customer-facing sentence naturally: ${customerMessage}` : "",
    `Case context:\n${context}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function conversationForProvider(input: GenerateInput): Array<{ role: "user" | "assistant"; content: string }> {
  const history = input.messages
    .filter((message) => message.sender_type === "user" || message.sender_type === "assistant" || message.sender_type === "mechanic")
    .slice(-18)
    .map((message) => ({
      role: message.sender_type === "assistant" ? ("assistant" as const) : ("user" as const),
      content: message.sender_type === "mechanic" ? `Mechanic note: ${message.content}` : message.content,
    }));
  if (history.at(-1)?.role !== "user" || history.at(-1)?.content !== input.userMessage) {
    history.push({ role: "user", content: input.userMessage });
  }
  return history;
}

function resultWithCost(result: Omit<AiGenerationResult, "estimatedCostUsd">): AiGenerationResult {
  const env = serverEnvironment();
  const estimatedCostUsd =
    (result.inputTokens / 1_000_000) * env.aiInputCostPerMillion +
    (result.outputTokens / 1_000_000) * env.aiOutputCostPerMillion;
  return { ...result, estimatedCostUsd: Number(estimatedCostUsd.toFixed(6)) };
}

function extractOpenAiText(data: Record<string, any>): string {
  if (typeof data.output_text === "string") return data.output_text.trim();
  const parts = Array.isArray(data.output)
    ? data.output.flatMap((item: Record<string, any>) => (Array.isArray(item.content) ? item.content : []))
    : [];
  return parts
    .map((part: Record<string, any>) => (part.type === "output_text" ? part.text || "" : ""))
    .join("")
    .trim();
}

function providerInputText(contents: Array<{ role: string; content: string }>, diagnosticCase: DiagnosticCaseRecord): string {
  return `${SYSTEM_PROMPT}\nCase: ${diagnosticCase.title}\n${contents.map((message) => `${message.role}: ${message.content}`).join("\n")}`;
}

function parseDiagnosticOutput(rawText: string): Pick<AiGenerationResult, "text" | "escalation"> {
  const raw = String(rawText || "").trim();
  const match = raw.match(/\[\[DIAGNOSTICA_ROUTING\s+(\{[^\r\n]*\})\]\]/i);
  let required = false;
  let category: EscalationCategory = "none";
  let reason = "";
  if (match?.[1]) {
    try {
      const routing = JSON.parse(match[1]) as Record<string, unknown>;
      required = routing.required === true;
      category = required ? escalationCategory(routing.category) : "none";
      reason = required ? cleanReason(routing.reason) : "";
    } catch {
      // A malformed private marker must never leak into the customer response.
    }
  }
  const text = raw
    .replace(/\[\[DIAGNOSTICA_ROUTING[\s\S]*?\]\]/gi, "")
    .replace(/^.*DIAGNOSTICA_ROUTING.*$/gim, "")
    .trim();
  return {
    text,
    escalation: {
      required,
      category,
      reason: required ? reason || "The AI requires human judgment to continue this case reliably." : "",
    },
  };
}

function applyEscalationMessage(
  result: Pick<AiGenerationResult, "text" | "escalation">,
  automation?: AutomationConfig
): Pick<AiGenerationResult, "text" | "escalation"> {
  if (!result.escalation.required) return result;
  const message = cleanInstruction(automation?.escalationCustomerMessage);
  if (!message || result.text.toLowerCase().includes(message.toLowerCase())) return result;
  return { ...result, text: `${result.text}\n\n${message}`.trim() };
}

function enforceEscalationPolicy(
  result: Pick<AiGenerationResult, "text" | "escalation">,
  input: GenerateInput
): Pick<AiGenerationResult, "text" | "escalation"> {
  if (!result.escalation.required || input.automation?.autonomousMode === false) return result;
  const userMessages = input.messages.filter((message) => message.sender_type === "user");
  const evidence = [input.diagnosticCase.symptoms, input.diagnosticCase.previous_work, input.userMessage, ...userMessages.map((message) => message.content)].join(" ");
  const immediateSafetyEvidence = /brake loss|no brakes|steering loss|fuel leak|strong fuel smell|smoke|fire|battery fire|oil pressure warning|severe overheat|high voltage exposure/i.test(evidence);
  const measuredEvidence = /\b(tested|measured|reading|result|confirmed|verified|scan data|live data|volts?|voltage|ohms?|amps?|psi|bar|kpa|compression|fuel pressure|vacuum)\b/i.test(evidence);
  const unsupportedEvidence = /\b(upload|image|photo|pdf|binary|ecu file|scan file|log file|vcds|odis)\b/i.test(evidence);

  const allowed =
    (result.escalation.category === "safety_review" && immediateSafetyEvidence) ||
    (result.escalation.category === "unsupported_input" && unsupportedEvidence && userMessages.length >= 2) ||
    (["ambiguous_evidence", "specialist_judgment"].includes(result.escalation.category) &&
      userMessages.length >= 3 &&
      (measuredEvidence || userMessages.length >= 6));
  if (allowed) return result;

  const configuredMessage = cleanInstruction(input.automation?.escalationCustomerMessage);
  const text = configuredMessage ? result.text.replace(configuredMessage, "").replace(/\n{3,}/g, "\n\n").trim() : result.text;
  return {
    text: text || "I need more diagnostic evidence before this case warrants human review. Tell me the latest test, measurement, or observation and I will continue working through it.",
    escalation: { required: false, category: "none", reason: "" },
  };
}

function escalationCategory(value: unknown): EscalationCategory {
  const category = String(value || "").trim() as EscalationCategory;
  return ["ambiguous_evidence", "specialist_judgment", "unsupported_input", "safety_review"].includes(category)
    ? category
    : "specialist_judgment";
}

function cleanReason(value: unknown): string {
  return String(value || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 500);
}

function cleanInstruction(value: unknown): string {
  return String(value || "").trim().slice(0, 3000);
}

function numberOrEstimate(value: unknown, text: string): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : Math.max(1, Math.ceil(text.length / 4));
}

function cleanModel(value: string, fallback: string): string {
  const model = String(value || "").trim().replace(/[^a-zA-Z0-9_.:-]/g, "");
  return model || fallback;
}
