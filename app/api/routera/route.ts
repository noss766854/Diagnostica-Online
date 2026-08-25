import { errorResponse, HttpError, json, readJson } from "@/lib/platform/http";
import { cleanRouteraModel, createRouteraCompletion, ROUTERA_DEFAULT_BASE_URL, ROUTERA_DEFAULT_MODEL } from "@/lib/platform/routera";

export const runtime = "nodejs";

const ROUTING_MARKER = "DIAGNOSTICA_ROUTING";
const DEFAULT_ESCALATION_MESSAGE =
  "This case needs a human review before I can guide you further safely. I have sent only the relevant case details to the review queue.";
const DEFAULT_PROMPT = [
  "You are the DiagnosticaOnline diagnostic service and an experienced automotive diagnostic assistant.",
  "Own the case from the first question through a useful test plan and interpretation of results.",
  "Reason from symptoms and test results instead of recommending parts swapping.",
  "Ask concise diagnostic questions and use the driver's exact details.",
  "Prioritize year, make, model, engine, mileage, warning lights, DTC codes, sounds, leaks, smells, recent work, and when the symptom appears.",
  "Warn clearly about overheating, brake or steering loss, smoke, fire, fuel leaks, oil-pressure warnings, and high-voltage hazards.",
  "Refuse emissions defeat, unlawful immobilizer bypass, odometer fraud, theft enablement, and unsafe bypass instructions.",
  "Do not advertise a human handoff during a normal case. Request human review only when remote diagnosis cannot continue safely or reliably.",
  "Never show a mechanic-facing case summary, internal brief, private note, routing metadata, or the heading 'Case Summary' to the customer.",
  `End every reply with exactly one private line: [[${ROUTING_MARKER} {"required":false,"category":"none","reason":""}]].`,
].join(" ");
const OUTPUT_LANGUAGES = {
  en: "English",
  es: "Spanish",
  ro: "Romanian",
  "ca-valencia": "Valencian (Valencià, using Valencian vocabulary and forms)",
} as const;
type Language = keyof typeof OUTPUT_LANGUAGES;

interface LegacyBody {
  messages?: Array<{ role?: unknown; content?: unknown }>;
  model?: unknown;
  systemPrompt?: unknown;
  language?: unknown;
  siteContent?: {
    autonomousMode?: unknown;
    escalationCustomerMessage?: unknown;
    escalationPolicy?: unknown;
  };
}

export async function POST(request: Request): Promise<Response> {
  try {
    if ((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new HttpError(409, "Open or create a saved diagnostic case so usage and messages can be tracked securely.");
    }
    if (process.env.VERCEL) {
      throw new HttpError(503, "Saved diagnostics must be configured before the production service can be used.");
    }

    const body = (await readJson(request)) as LegacyBody;
    const messages = Array.isArray(body.messages)
      ? body.messages
          .filter((message) => message && (message.role === "user" || message.role === "assistant"))
          .slice(-16)
          .map((message) => ({
            role: message.role as "user" | "assistant",
            content: cleanText(message.content, 3000),
          }))
          .filter((message) => message.content)
      : [];
    if (!messages.some((message) => message.role === "user")) {
      throw new HttpError(400, "No diagnostic message was provided.");
    }

    const language = normalizeLanguage(body.language);
    const completion = await createRouteraCompletion({
      apiKey: process.env.ROUTERA_API_KEY || "",
      baseUrl: process.env.ROUTERA_API_BASE_URL || ROUTERA_DEFAULT_BASE_URL,
      model: cleanRouteraModel(process.env.ROUTERA_MODEL || body.model, ROUTERA_DEFAULT_MODEL),
      messages: [
        { role: "system", content: buildSystemPrompt(body, language) },
        ...messages,
      ],
      timeoutMs: 60_000,
    });
    const result = customerReply(completion.text, body, language);
    if (!result.text) throw new HttpError(502, "The diagnostic service returned an empty response.");
    return json(result);
  } catch (error) {
    return errorResponse(error, "The diagnostic service could not generate a reply.");
  }
}

function buildSystemPrompt(body: LegacyBody, language: Language): string {
  const configuredPrompt = cleanText(body.systemPrompt, 5000) || DEFAULT_PROMPT;
  const escalationPolicy = cleanText(body.siteContent?.escalationPolicy, 2000);
  return [
    DEFAULT_PROMPT,
    configuredPrompt === DEFAULT_PROMPT ? "" : `Admin-configured diagnostic instructions: ${configuredPrompt}`,
    `Write the complete customer-facing response in ${OUTPUT_LANGUAGES[language]}. Keep DTC codes, measurements, and private routing JSON keys unchanged.`,
    body.siteContent?.autonomousMode === false
      ? "Autonomous mode is disabled, but complete as much diagnosis as possible before requesting review."
      : "Autonomous mode is enabled. Continue the diagnosis unless human judgment is genuinely required.",
    escalationPolicy ? `Admin escalation policy: ${escalationPolicy}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function customerReply(rawText: string, body: LegacyBody, language: Language) {
  const marker = rawText.match(/\[\[DIAGNOSTICA_ROUTING\s+(\{[^\r\n]*\})\]\]/i);
  let routing = { required: false, category: "none", reason: "" };
  if (marker?.[1]) {
    try {
      const parsed = JSON.parse(marker[1]) as Record<string, unknown>;
      const category = String(parsed.category || "");
      const allowed = ["ambiguous_evidence", "specialist_judgment", "unsupported_input", "safety_review"];
      if (parsed.required === true) {
        routing = {
          required: true,
          category: allowed.includes(category) ? category : "specialist_judgment",
          reason: cleanText(parsed.reason, 500) || "Human judgment is required to continue this case reliably.",
        };
      }
    } catch {
      // Invalid private metadata is stripped and treated as autonomous handling.
    }
  }

  let text = rawText
    .replace(/\[\[DIAGNOSTICA_ROUTING[\s\S]*?\]\]/gi, "")
    .replace(/^.*DIAGNOSTICA_ROUTING.*$/gim, "")
    .replace(/\n?\s*(?:\*\*)?(?:case summary|mechanic brief|technician brief|internal brief|private notes)(?:\*\*)?\s*:?\s*[\s\S]*$/i, "")
    .trim();
  routing = enforceAutonomousRouting(routing, body);
  if (routing.required) {
    const message = language === "en"
      ? cleanText(body.siteContent?.escalationCustomerMessage, 700) || DEFAULT_ESCALATION_MESSAGE
      : localizedEscalation(language);
    if (!text.toLowerCase().includes(message.toLowerCase())) text = `${text}\n\n${message}`.trim();
  }
  return { text, routing };
}

function enforceAutonomousRouting(routing: { required: boolean; category: string; reason: string }, body: LegacyBody) {
  if (!routing.required || body.siteContent?.autonomousMode === false) return routing;
  const messages = Array.isArray(body.messages) ? body.messages.filter((message) => message?.role === "user") : [];
  const evidence = messages.map((message) => cleanText(message.content, 3000)).join(" ");
  const safety = /brake loss|no brakes|steering loss|fuel leak|strong fuel smell|smoke|fire|battery fire|oil pressure warning|severe overheat|high voltage exposure/i.test(evidence);
  const measured = /\b(tested|measured|reading|result|confirmed|verified|scan data|live data|volts?|ohms?|amps?|psi|compression|fuel pressure|vacuum)\b/i.test(evidence);
  const allowed =
    (routing.category === "safety_review" && safety) ||
    (["ambiguous_evidence", "specialist_judgment"].includes(routing.category) && messages.length >= 3 && (measured || messages.length >= 6));
  return allowed ? routing : { required: false, category: "none", reason: "" };
}

function normalizeLanguage(value: unknown): Language {
  const language = String(value || "en").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(OUTPUT_LANGUAGES, language) ? (language as Language) : "en";
}

function localizedEscalation(language: Language): string {
  const messages: Record<Language, string> = {
    en: DEFAULT_ESCALATION_MESSAGE,
    es: "Este caso necesita una revisión humana antes de que pueda seguir orientándote con seguridad. Solo he enviado los datos relevantes a la cola de revisión.",
    ro: "Acest caz necesită o evaluare umană înainte de a te putea îndruma în continuare în siguranță. Am trimis doar detaliile relevante în coada de evaluare.",
    "ca-valencia": "Este cas necessita una revisió humana abans que puga continuar orientant-te amb seguretat. Només he enviat les dades rellevants a la cua de revisió.",
  };
  return messages[language];
}

function cleanText(value: unknown, maxLength: number): string {
  return String(value || "").trim().slice(0, maxLength);
}
