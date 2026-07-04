import { createClient } from "@supabase/supabase-js";

import { canonicalSiteOrigin } from "@/lib/platform/site-url";

export const runtime = "nodejs";

const DEFAULT_CONTENT = {
  videoRateUsd: 40,
  voiceRateUsd: 20,
  minimumCallMinutes: 30,
  maximumCallMinutes: 240,
  durationOptions: "30,60,90,120",
  bookingConfirmationSubject: "Your DiagnosticaOnline mechanic booking",
  jitsiDomain: "meet.jit.si",
};

export async function POST(request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY || "";
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!stripeKey || !stripeWebhookSecret || !supabaseUrl || !serviceRoleKey) {
      return json({ error: "Checkout is not configured. Add Stripe keys, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY in Vercel." }, 503);
    }

    const token = bearerToken(request.headers.get("authorization") || "");
    if (!token) return json({ error: "Login is required before paid booking." }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "User session could not be verified." }, 401);
    const { data: profile } = await supabase.from("profiles").select("is_disabled,disabled_reason").eq("id", userData.user.id).maybeSingle();
    if (profile?.is_disabled) return json({ error: profile.disabled_reason || "This account has been disabled." }, 403);

    const body = await request.json();
    const callType = body.callType === "voice" ? "voice" : body.callType === "video" ? "video" : "";
    if (!callType) return json({ error: "Only paid voice or video bookings use checkout." }, 400);

    const siteContent = await loadSiteContent(supabase);
    if (!legalCheckoutReady(siteContent)) {
      return json({ error: "Paid bookings are paused until the business address and final refund/cancellation policy are completed in Admin." }, 503);
    }
    const durationMinutes = clampToOptions(Number(body.durationMinutes || siteContent.minimumCallMinutes), siteContent);
    const hourlyRate = callType === "video" ? siteContent.videoRateUsd : siteContent.voiceRateUsd;
    const totalCents = Math.max(50, Math.round(hourlyRate * 100 * (durationMinutes / 60)));
    const totalUsd = totalCents / 100;
    const conversationId = isUuid(body.conversationId) ? body.conversationId : null;
    const diagnosticCaseId = isUuid(body.diagnosticCaseId) ? body.diagnosticCaseId : null;
    const scheduledStartAt = cleanIsoDate(body.scheduledStartAt);
    if (body.scheduledStartAt && !scheduledStartAt) return json({ error: "Choose a valid booking time." }, 400);
    if (scheduledStartAt && new Date(scheduledStartAt).getTime() < Date.now() - 5 * 60 * 1000) {
      return json({ error: "The preferred booking time cannot be in the past." }, 400);
    }
    const siteUrl = canonicalSiteOrigin(request);
    await verifyLinkedCase(supabase, userData.user.id, diagnosticCaseId, conversationId);

    const { data: booking, error: bookingError } = await supabase
      .from("call_bookings")
      .insert({
        owner_id: userData.user.id,
        conversation_id: conversationId,
        diagnostic_case_id: diagnosticCaseId,
        call_type: callType,
        duration_minutes: durationMinutes,
        hourly_rate_usd: hourlyRate,
        total_usd: totalUsd,
        meeting_url: null,
        customer_email: userData.user.email || null,
        scheduled_start_at: scheduledStartAt,
        status: "awaiting_checkout",
        payment_status: "unpaid",
      })
      .select("id")
      .single();
    if (bookingError || !booking) throw new Error(bookingError?.message || "The pending booking could not be saved.");

    let session;
    try {
      session = await createStripeSession({
        stripeKey,
        siteUrl,
        bookingId: booking.id,
        callType,
        durationMinutes,
        hourlyRate,
        totalCents,
        conversationId,
        diagnosticCaseId,
        userId: userData.user.id,
        customerEmail: userData.user.email || "",
        scheduledStartAt,
      });
    } catch (error) {
      await supabase.from("call_bookings").delete().eq("id", booking.id).eq("status", "awaiting_checkout");
      throw error;
    }

    const { error: sessionSaveError } = await supabase
      .from("call_bookings")
      .update({ checkout_session_id: session.id || null, status: "checkout_started" })
      .eq("id", booking.id);
    if (sessionSaveError) throw new Error("The Stripe session was created but could not be linked to the booking.");
    await supabase.from("usage_events").insert({
      user_id: userData.user.id,
      case_id: diagnosticCaseId,
      event_type: "checkout",
      metadata: { booking_id: booking.id, call_type: callType, amount_cents: totalCents },
    });

    return json({ url: session.url });
  } catch (error) {
    return json({ error: error instanceof Error ? safeError(error.message, "Checkout failed.") : "Checkout failed." }, 500);
  }
}

async function createStripeSession({ stripeKey, siteUrl, bookingId, callType, durationMinutes, hourlyRate, totalCents, conversationId, diagnosticCaseId, userId, customerEmail, scheduledStartAt }) {
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${siteUrl}/?checkout=success&call=${encodeURIComponent(callType)}&booking=${encodeURIComponent(bookingId)}`);
  params.set("cancel_url", `${siteUrl}/?checkout=cancelled`);
  if (customerEmail) params.set("customer_email", customerEmail);
  params.set("metadata[kind]", "mechanic_call");
  params.set("metadata[bookingId]", bookingId);
  params.set("metadata[callType]", callType);
  params.set("metadata[durationMinutes]", String(durationMinutes));
  params.set("metadata[conversationId]", conversationId || "");
  params.set("metadata[diagnosticCaseId]", diagnosticCaseId || "");
  params.set("metadata[userId]", userId);
  params.set("metadata[scheduledStartAt]", scheduledStartAt || "");
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][unit_amount]", String(totalCents));
  params.set("line_items[0][price_data][product_data][name]", `${capitalize(callType)} mechanic consultation`);
  params.set("line_items[0][price_data][product_data][description]", `${durationMinutes} minutes at $${hourlyRate}/hour`);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.url) {
    throw new Error(data.error?.message || "Stripe did not create a checkout session.");
  }
  return data;
}

async function loadSiteContent(supabase) {
  try {
    const { data, error } = await supabase.from("site_settings").select("value").eq("key", "public_content").maybeSingle();
    if (error) throw error;
    return sanitizeContent(data?.value);
  } catch (error) {
    return sanitizeContent({});
  }
}

function sanitizeContent(value) {
  const merged = { ...DEFAULT_CONTENT, ...(value && typeof value === "object" ? value : {}) };
  return {
    videoRateUsd: cleanMoney(merged.videoRateUsd, DEFAULT_CONTENT.videoRateUsd),
    voiceRateUsd: cleanMoney(merged.voiceRateUsd, DEFAULT_CONTENT.voiceRateUsd),
    minimumCallMinutes: cleanMinutes(merged.minimumCallMinutes, DEFAULT_CONTENT.minimumCallMinutes),
    maximumCallMinutes: cleanMinutes(merged.maximumCallMinutes, DEFAULT_CONTENT.maximumCallMinutes),
    durationOptions: cleanDurationOptions(merged.durationOptions, DEFAULT_CONTENT.durationOptions),
    jitsiDomain: cleanDomain(merged.jitsiDomain, DEFAULT_CONTENT.jitsiDomain),
    businessAddress: String(merged.businessAddress || "").trim(),
    refundPolicyText: String(merged.refundText || merged.refundPolicySummary || "").trim(),
  };
}

function cleanMoney(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
}

function cleanMinutes(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 5 ? Math.round(number) : fallback;
}

function cleanDurationOptions(value, fallback) {
  const options = String(value || fallback)
    .split(",")
    .map((item) => Math.round(Number(item.trim())))
    .filter((number) => Number.isFinite(number) && number >= 5 && number <= 480);
  return Array.from(new Set(options)).sort((a, b) => a - b);
}

function clampToOptions(value, siteContent) {
  const options = siteContent.durationOptions.filter((option) => option >= siteContent.minimumCallMinutes && option <= siteContent.maximumCallMinutes);
  if (options.includes(value)) return value;
  return options[0] || siteContent.minimumCallMinutes;
}

function cleanIsoDate(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function legalCheckoutReady(content) {
  const address = String(content.businessAddress || "").trim();
  const refund = String(content.refundPolicyText || "").trim();
  return Boolean(address && refund && !/add your|not configured|placeholder/i.test(`${address} ${refund}`));
}

async function verifyLinkedCase(supabase, userId, diagnosticCaseId, conversationId) {
  if (diagnosticCaseId) {
    const { data, error } = await supabase.from("diagnostic_cases").select("id").eq("id", diagnosticCaseId).eq("owner_id", userId).maybeSingle();
    if (error || !data) throw new Error("The diagnostic case does not belong to this account.");
  }
  if (conversationId) {
    const { data, error } = await supabase.from("conversations").select("id").eq("id", conversationId).eq("owner_id", userId).maybeSingle();
    if (error || !data) throw new Error("The saved conversation does not belong to this account.");
  }
}

function cleanDomain(value, fallback) {
  const text = String(value || "").trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  return text || fallback;
}

function bearerToken(value) {
  const match = String(value).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function safeError(message, fallback) {
  const text = String(message || "").replace(/[\r\n]+/g, " ").trim();
  return text ? text.slice(0, 180) : fallback;
}

function json(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
