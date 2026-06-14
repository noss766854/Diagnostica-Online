const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";
    if (!apiKey) {
      return json({ error: "Missing GEMINI_API_KEY" }, 500);
    }

    const body = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const contents = messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .slice(-12)
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: String(message.content || "") }],
      }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: [
                  "You are WrenchLine's mechanic intake assistant.",
                  "Ask one concise diagnostic question at a time.",
                  "Collect year, make, model, engine, mileage, warning lights, OBD-II codes, sounds, leaks, smells, recent work, and when the issue appears.",
                  "Flag urgent safety conditions like overheating, brake loss, smoke, fuel smell, or oil pressure warnings.",
                  "Prepare the driver for a paid voice or video mechanic session without claiming to replace an in-person inspection.",
                ].join(" "),
              },
            ],
          },
          contents,
          generationConfig: {
            temperature: 0.45,
            maxOutputTokens: 360,
          },
        }),
      },
    );

    if (!response.ok) {
      return json({ error: await response.text() }, response.status);
    }

    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || "")
        .join("")
        .trim() || "";

    return json({ text });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
