import { HttpError } from "@/lib/platform/http";
import { serverEnvironment } from "@/lib/platform/env";
import type { AiGenerationResult, DiagnosticCaseRecord, DiagnosticMessageRecord } from "@/types/diagnostics";

interface GenerateInput {
  diagnosticCase: DiagnosticCaseRecord;
  messages: DiagnosticMessageRecord[];
  userMessage: string;
}

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
        systemInstruction: { parts: [{ text: systemPrompt(input.diagnosticCase) }] },
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

  const text = String(
    data.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || "")
      .join("") || ""
  ).trim();
  if (!text) throw new HttpError(502, "Gemini returned an empty diagnostic reply.");
  const inputTokens = numberOrEstimate(data.usageMetadata?.promptTokenCount, providerInputText(contents, input.diagnosticCase));
  const outputTokens = numberOrEstimate(data.usageMetadata?.candidatesTokenCount, text);
  return resultWithCost({ text, provider: "gemini", model, inputTokens, outputTokens });
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
      instructions: systemPrompt(input.diagnosticCase),
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
  const text = extractOpenAiText(data);
  if (!text) throw new HttpError(502, "OpenAI returned an empty diagnostic reply.");
  const inputTokens = numberOrEstimate(data.usage?.input_tokens, providerInputText(contents, input.diagnosticCase));
  const outputTokens = numberOrEstimate(data.usage?.output_tokens, text);
  return resultWithCost({ text, provider: "openai", model, inputTokens, outputTokens });
}

function systemPrompt(diagnosticCase: DiagnosticCaseRecord): string {
  const vehicle = diagnosticCase.vehicle;
  const context = [
    vehicle ? `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}; engine/powertrain: ${vehicle.engine}; fuel: ${vehicle.fuel_type}; gearbox: ${vehicle.gearbox}.` : "Vehicle details are incomplete.",
    vehicle?.vin ? `VIN supplied: ${vehicle.vin}.` : "VIN not supplied.",
    vehicle?.ecu ? `ECU identifier supplied: ${vehicle.ecu}.` : "ECU identifier not supplied.",
    `Symptoms: ${diagnosticCase.symptoms}`,
    diagnosticCase.dtc_codes.length ? `DTC codes: ${diagnosticCase.dtc_codes.join(", ")}.` : "No DTC codes supplied.",
    diagnosticCase.previous_work ? `Previous repairs/tests: ${diagnosticCase.previous_work}` : "No previous repairs or tests supplied.",
  ].join("\n");
  return `${SYSTEM_PROMPT}\n\nCase context:\n${context}`;
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
  return `${systemPrompt(diagnosticCase)}\n${contents.map((message) => `${message.role}: ${message.content}`).join("\n")}`;
}

function numberOrEstimate(value: unknown, text: string): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : Math.max(1, Math.ceil(text.length / 4));
}

function cleanModel(value: string, fallback: string): string {
  const model = String(value || "").trim().replace(/[^a-zA-Z0-9_.:-]/g, "");
  return model || fallback;
}
