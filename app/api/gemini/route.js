export const runtime = "nodejs";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_PROMPT = [
  "You are Gemini Diagnostic AI for DiagnosticaOnline.",
  "You are an LLM intake assistant before a live technician handoff.",
  "Ask concise diagnostic questions and use the driver's exact details.",
  "Prioritize year, make, model, engine, mileage, warning lights, OBD-II codes, sounds, leaks, smells, recent work, and when the symptom appears.",
  "Flag urgent safety conditions like overheating, brake loss, smoke, fuel smell, or oil pressure warnings.",
  "When enough details are collected, tell the customer that a live technician can continue by free text chat, voice, or video.",
  "Never show a mechanic-facing case summary, internal brief, bullet-point diagnostic summary, or the heading 'Case Summary' to the customer.",
  "Do not pretend to be a human technician and do not replace an in-person inspection.",
].join(" ");
const DEFAULT_CUSTOMER_HANDOFF =
  "I have enough detail for a live mechanic to continue. You can start a free technician text chat, or reserve a paid voice or video call whenever you're ready.";

export async function POST(request) {
  try {
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
    const text = sanitizeCustomerReply(rawText, body);

    if (!text) {
      return json({ error: "Gemini returned an empty response." }, 502);
    }

    return json({ text });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Gemini route failed." }, 500);
  }
}

function buildSystemPrompt(body) {
  const prompt = cleanText(body.systemPrompt, 5000) || DEFAULT_PROMPT;
  const siteContent = body.siteContent && typeof body.siteContent === "object" ? body.siteContent : {};
  const technicianName = cleanText(siteContent.technicianName, 100) || "the live technician";
  const technicianTitle = cleanText(siteContent.technicianTitle, 100) || "technician";
  const handoffMessage = safeCustomerHandoff(cleanText(siteContent.handoffMessage, 700), siteContent);
  const vehicle = cleanText(JSON.stringify(body.vehicle || {}), 1200);
  const brief = cleanText(body.brief, 1200);

  return [
    prompt,
    "Hard privacy rule: the customer chat must not include mechanic-facing summaries, internal notes, technician briefs, copied case details, markdown bullet case summaries, or any 'Case Summary' section. Keep those details implicit for the live technician only.",
    `If the case is ready, say only this customer-facing handoff line: "${handoffMessage}"`,
    `Live handoff technician: ${technicianName}, ${technicianTitle}.`,
    vehicle && vehicle !== "{}" ? `Current vehicle context: ${vehicle}` : "",
    brief ? `Private technician-only brief context, do not repeat to customer: ${brief}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function sanitizeCustomerReply(text, body) {
  const original = cleanText(text, 4000);
  if (!original) return "";
  const withoutPrivateSections = stripPrivateSections(original);
  if (looksLikePrivateHandoff(original) || !withoutPrivateSections) {
    return safeCustomerHandoff("", body?.siteContent);
  }
  return withoutPrivateSections;
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

function safeCustomerHandoff(value, siteContent = {}) {
  const technicianName = cleanText(siteContent?.technicianName, 100);
  const fallback = technicianName
    ? `I have enough detail for ${technicianName} to continue. You can start a free technician text chat, or reserve a paid voice or video call whenever you're ready.`
    : DEFAULT_CUSTOMER_HANDOFF;
  const text = stripPrivateSections(cleanText(value, 300));
  if (!text || looksLikePrivateHandoff(text)) return fallback;
  return text;
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
