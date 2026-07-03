export const runtime = "nodejs";

const DEFAULT_MODEL = "gemini-2.5-flash";
const ROUTING_MARKER = "DIAGNOSTICA_ROUTING";
const DEFAULT_PROMPT = [
  "You are Gemini Diagnostic AI for DiagnosticaOnline.",
  "You are the primary diagnostic assistant, not an intake assistant.",
  "Own the case from initial questions through a useful test plan and interpretation of results.",
  "Ask concise diagnostic questions and use the driver's exact details. Do not stop merely because another observation or test is needed.",
  "Prioritize year, make, model, engine, mileage, warning lights, OBD-II codes, sounds, leaks, smells, recent work, and when the symptom appears.",
  "Flag urgent safety conditions like overheating, brake loss, smoke, fuel smell, or oil pressure warnings.",
  "Do not advertise or offer a human handoff during a normal case.",
  "Request human review only when you cannot safely or reliably make further progress after reasonable remote diagnostics.",
  "Never show a mechanic-facing case summary, internal brief, bullet-point diagnostic summary, or the heading 'Case Summary' to the customer.",
  "Do not pretend to be a human technician and do not replace an in-person inspection.",
  `End every reply with exactly one private line: [[${ROUTING_MARKER} {"required":false,"category":"none","reason":""}]].`,
].join(" ");
const DEFAULT_ESCALATION_MESSAGE =
  "This case needs a human review before I can guide you further safely. I have sent only the relevant case details to the review queue.";

export async function POST(request) {
  try {
    if ((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Open or create a saved diagnostic case so AI usage and messages can be tracked securely." }, 409);
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return json({ error: "GEMINI_API_KEY is not configured on the server." }, 503);
    }

    const body = await request.json();
    const model = cleanModel(process.env.GEMINI_MODEL || body.model || DEFAULT_MODEL);
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const contents = messages
      .filter((message) => message && (message.role === "user" || message.role === "assistant"))
      .slice(-16)
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: cleanText(message.content, 3000) }],
      }))
      .filter((entry) => entry.parts[0].text);

    if (!contents.some((entry) => entry.role === "user")) {
      return json({ error: "No user message was provided for Gemini." }, 400);
    }

    const systemPrompt = buildSystemPrompt(body);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents,
          generationConfig: {
            temperature: 0.45,
            maxOutputTokens: 600,
          },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return json({ error: data.error?.message || "Gemini request failed." }, response.status);
    }

    const rawText =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim() || "";
    const result = parseDiagnosticOutput(rawText, body);
    const text = sanitizeCustomerReply(result.text);

    if (!text) {
      return json({ error: "Gemini returned an empty response." }, 502);
    }

    return json({ text, routing: result.routing });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Gemini route failed." }, 500);
  }
}

function buildSystemPrompt(body) {
  const prompt = cleanText(body.systemPrompt, 5000) || DEFAULT_PROMPT;
  const siteContent = body.siteContent && typeof body.siteContent === "object" ? body.siteContent : {};
  const escalationPolicy = cleanText(siteContent.escalationPolicy, 3000);
  const escalationMessage = cleanText(siteContent.escalationCustomerMessage, 700) || DEFAULT_ESCALATION_MESSAGE;
  const vehicle = cleanText(JSON.stringify(body.vehicle || {}), 1200);
  const brief = cleanText(body.brief, 1200);

  return [
    prompt,
    "Hard operating rule: this is an AI-run service. Continue the diagnosis yourself and do not offer text, voice, video, or a human handoff in a normal case.",
    "Escalate only when human judgment is genuinely required and you cannot safely or reliably continue. Missing ordinary details, needing another test, or low initial confidence are not escalation reasons.",
    escalationPolicy ? `Admin escalation policy: ${escalationPolicy}` : "",
    `If escalation is required, include this sentence naturally: "${escalationMessage}"`,
    `End every reply with exactly one private routing line: [[${ROUTING_MARKER} {"required":false,"category":"none","reason":""}]]. Set required to true only when the escalation policy is met.`,
    "Hard privacy rule: the customer chat must not include internal summaries, routing reasons, private notes, or any 'Case Summary' section.",
    vehicle && vehicle !== "{}" ? `Current vehicle context: ${vehicle}` : "",
    brief ? `Existing AI case context, do not copy it back verbatim: ${brief}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function sanitizeCustomerReply(text) {
  const original = cleanText(text, 4000);
  if (!original) return "";
  const withoutPrivateSections = stripPrivateSections(original);
  if (looksLikePrivateHandoff(original) || !withoutPrivateSections) {
    return "I have kept the internal case notes private. Tell me the latest symptom or test result and I will continue the diagnosis.";
  }
  return withoutPrivateSections;
}

function parseDiagnosticOutput(text, body) {
  const raw = cleanText(text, 5000);
  const match = raw.match(/\[\[DIAGNOSTICA_ROUTING\s+(\{[^\r\n]*\})\]\]/i);
  let routing = { required: false, category: "none", reason: "" };
  if (match?.[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      const allowed = ["ambiguous_evidence", "specialist_judgment", "unsupported_input", "safety_review"];
      if (parsed.required === true) {
        routing = {
          required: true,
          category: allowed.includes(parsed.category) ? parsed.category : "specialist_judgment",
          reason: cleanText(parsed.reason, 500) || "The AI requires human judgment to continue this case reliably.",
        };
      }
    } catch {
      // Invalid routing metadata is stripped and defaults to autonomous handling.
    }
  }
  let customerText = raw
    .replace(/\[\[DIAGNOSTICA_ROUTING[\s\S]*?\]\]/gi, "")
    .replace(/^.*DIAGNOSTICA_ROUTING.*$/gim, "")
    .trim();
  const requestedEscalation = routing.required;
  routing = enforceAutonomousRouting(routing, body);
  if (requestedEscalation && !routing.required) {
    const configured = cleanText(body?.siteContent?.escalationCustomerMessage, 700) || DEFAULT_ESCALATION_MESSAGE;
    customerText = customerText.replace(configured, "").replace(/\n{3,}/g, "\n\n").trim();
  }
  if (routing.required) {
    const configured = cleanText(body?.siteContent?.escalationCustomerMessage, 700) || DEFAULT_ESCALATION_MESSAGE;
    if (!customerText.toLowerCase().includes(configured.toLowerCase())) customerText = `${customerText}\n\n${configured}`.trim();
  }
  return {
    text: customerText || "I need more diagnostic evidence before this case warrants human review. Tell me the latest test, measurement, or observation and I will continue working through it.",
    routing,
  };
}

function enforceAutonomousRouting(routing, body) {
  if (!routing.required || body?.siteContent?.autonomousMode === false) return routing;
  const messages = Array.isArray(body?.messages) ? body.messages.filter((message) => message?.role === "user") : [];
  const evidence = messages.map((message) => cleanText(message.content, 3000)).join(" ");
  const safety = /brake loss|no brakes|steering loss|fuel leak|strong fuel smell|smoke|fire|battery fire|oil pressure warning|severe overheat|high voltage exposure/i.test(evidence);
  const measured = /\b(tested|measured|reading|result|confirmed|verified|scan data|live data|volts?|ohms?|amps?|psi|compression|fuel pressure|vacuum)\b/i.test(evidence);
  const allowed =
    (routing.category === "safety_review" && safety) ||
    (["ambiguous_evidence", "specialist_judgment"].includes(routing.category) && messages.length >= 3 && (measured || messages.length >= 6));
  return allowed ? routing : { required: false, category: "none", reason: "" };
}

function stripPrivateSections(text) {
  return text
    .replace(/\n?\s*(?:\*\*)?(?:case summary|mechanic brief|technician brief|internal brief|private notes)(?:\*\*)?\s*:?\s*[\s\S]*$/i, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function looksLikePrivateHandoff(text) {
  return (
    /(?:\*\*)?case summary(?:\*\*)?\s*:/i.test(text) ||
    /(?:mechanic|technician|internal)\s+brief\s*:/i.test(text) ||
    /technician-ready case/i.test(text) ||
    /brief already in hand/i.test(text) ||
    /organized the symptoms/i.test(text)
  );
}

function cleanModel(value) {
  const model = String(value || DEFAULT_MODEL).trim().replace(/[^a-zA-Z0-9_.-]/g, "");
  return model || DEFAULT_MODEL;
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function json(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
