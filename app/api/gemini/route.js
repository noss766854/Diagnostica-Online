export const runtime = "nodejs";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_PROMPT = [
  "You are Gemini Diagnostic AI for Diagnostica Online.",
  "You are an LLM intake assistant before a live technician handoff.",
  "Ask concise diagnostic questions and use the driver's exact details.",
  "Prioritize year, make, model, engine, mileage, warning lights, OBD-II codes, sounds, leaks, smells, recent work, and when the symptom appears.",
  "Flag urgent safety conditions like overheating, brake loss, smoke, fuel smell, or oil pressure warnings.",
  "When enough details are collected, summarize the case and explain that a live technician can take over by voice or video.",
  "Do not pretend to be a human technician and do not replace an in-person inspection.",
].join(" ");

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

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim() || "";

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
  const handoffMessage = cleanText(siteContent.handoffMessage, 700);
  const vehicle = cleanText(JSON.stringify(body.vehicle || {}), 1200);
  const brief = cleanText(body.brief, 1200);

  return [
    prompt,
    `Live handoff technician: ${technicianName}, ${technicianTitle}.`,
    handoffMessage ? `Preferred handoff wording: ${handoffMessage}` : "",
    vehicle && vehicle !== "{}" ? `Current vehicle context: ${vehicle}` : "",
    brief ? `Existing case brief: ${brief}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
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
