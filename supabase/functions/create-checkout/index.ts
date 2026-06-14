import Stripe from "npm:stripe@16.12.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-06-20",
});

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!Deno.env.get("STRIPE_SECRET_KEY")) {
      return json({ error: "Missing STRIPE_SECRET_KEY" }, 500);
    }

    const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "http://localhost:3000";
    const body = await request.json();
    const callType = body.callType === "voice" ? "voice" : "video";
    const durationMinutes = clamp(Number(body.durationMinutes || 60), 30, 240);
    const hourlyRate = callType === "video" ? 40 : 20;
    const totalCents = Math.round(hourlyRate * 100 * (durationMinutes / 60));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${siteUrl}?checkout=success&call=${callType}`,
      cancel_url: `${siteUrl}?checkout=cancelled`,
      metadata: {
        callType,
        durationMinutes: String(durationMinutes),
        conversationId: String(body.conversationId || ""),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: totalCents,
            product_data: {
              name: `${capitalize(callType)} mechanic consultation`,
              description: `${durationMinutes} minutes at $${hourlyRate}/hour`,
            },
          },
        },
      ],
    });

    return json({ url: session.url });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
