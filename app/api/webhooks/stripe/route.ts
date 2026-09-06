import { errorResponse, HttpError, json } from "@/lib/platform/http";
import { CANONICAL_SITE_URL } from "@/lib/platform/site-url";
import { stripeId, verifyStripeWebhook } from "@/lib/platform/stripe";
import { resolveStripeCredential } from "@/lib/platform/secrets";
import { supabaseService } from "@/lib/platform/supabase";
import { Resend } from "resend";

export const runtime = "nodejs";

interface StripeEvent {
  id: string;
  type: string;
  created?: number;
  data?: { object?: Record<string, any> };
}

export async function POST(request: Request): Promise<Response> {
  let event: StripeEvent | null = null;
  try {
    const payload = await request.text();
    const { apiKey: webhookSecret } = await resolveStripeCredential("webhookSecret");
    verifyStripeWebhook(payload, request.headers.get("stripe-signature") || "", webhookSecret);
    event = JSON.parse(payload) as StripeEvent;
    if (!event.id || !event.type || !event.data?.object) throw new HttpError(400, "Stripe event payload is incomplete.");

    const supabase = supabaseService();
    const { data: existing } = await supabase
      .from("stripe_webhook_events")
      .select("status,attempts,updated_at")
      .eq("event_id", event.id)
      .maybeSingle();
    if (existing?.status === "processed") return json({ received: true, duplicate: true });
    if (existing?.status === "processing" && Date.now() - new Date(existing.updated_at).getTime() < 5 * 60 * 1000) {
      return json({ received: true, duplicate: true });
    }

    const eventRecord = {
        event_id: event.id,
        event_type: event.type,
        status: "processing",
        attempts: Number(existing?.attempts || 0) + 1,
        last_error: null,
        stripe_created_at: event.created ? new Date(event.created * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      };
    const eventWrite = existing
      ? await supabase.from("stripe_webhook_events").update(eventRecord).eq("event_id", event.id)
      : await supabase.from("stripe_webhook_events").insert(eventRecord);
    const eventError = eventWrite.error;
    if (!existing && eventError?.code === "23505") return json({ received: true, duplicate: true });
    if (eventError) throw new HttpError(500, `${eventError.message}. Run the latest supabase-schema.sql before enabling Stripe webhooks.`);

    await processEvent(event, supabase);
    await supabase
      .from("stripe_webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString(), last_error: null })
      .eq("event_id", event.id);
    return json({ received: true });
  } catch (error) {
    if (event?.id) {
      try {
        await supabaseService()
          .from("stripe_webhook_events")
          .update({ status: "failed", last_error: safeWebhookError(error), updated_at: new Date().toISOString() })
          .eq("event_id", event.id);
      } catch {
        // Stripe will retry non-2xx responses; preserve the original processing error.
      }
    }
    return errorResponse(error, "Stripe webhook processing failed.");
  }
}

async function processEvent(event: StripeEvent, supabase: ReturnType<typeof supabaseService>): Promise<void> {
  const object = event.data?.object || {};
  if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(event.type)) {
    if (object.metadata?.kind === "mechanic_call") await settleMechanicBooking(object, supabase);
    if (object.metadata?.kind === "premium_subscription" || object.mode === "subscription") {
      await activatePremiumFromCheckout(object, supabase);
    }
    return;
  }
  if (event.type === "checkout.session.async_payment_failed" && object.metadata?.kind === "mechanic_call") {
    await supabase
      .from("call_bookings")
      .update({ status: "payment_failed", payment_status: "failed" })
      .eq("checkout_session_id", stripeId(object.id));
    return;
  }
  if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
    await synchronizeSubscription(object, supabase, event.type === "customer.subscription.deleted");
    return;
  }
  if (event.type === "invoice.payment_failed") {
    const subscriptionId = stripeId(object.subscription || object.parent?.subscription_details?.subscription);
    if (subscriptionId) {
      await supabase
        .from("user_plans")
        .update({ status: "past_due" })
        .eq("provider_subscription_id", subscriptionId)
        .neq("plan_tier", "admin");
    }
  }
}

async function settleMechanicBooking(object: Record<string, any>, supabase: ReturnType<typeof supabaseService>): Promise<void> {
  const bookingId = cleanUuid(object.metadata?.bookingId);
  const ownerId = cleanUuid(object.metadata?.userId);
  if (!bookingId || !ownerId) throw new HttpError(400, "Mechanic checkout metadata is incomplete.");
  if (object.payment_status !== "paid" && object.payment_status !== "no_payment_required") return;

  const { data: booking, error } = await supabase
    .from("call_bookings")
    .select("id,owner_id,call_type,duration_minutes,scheduled_start_at,total_usd,status,customer_email")
    .eq("id", bookingId)
    .eq("owner_id", ownerId)
    .eq("checkout_session_id", stripeId(object.id))
    .maybeSingle();
  if (error || !booking) throw new HttpError(404, "The paid mechanic booking could not be matched.");
  if (booking.status === "paid") return;

  const expectedCents = Math.round(Number(booking.total_usd || 0) * 100);
  const paidCents = Number(object.amount_total || 0);
  if (!expectedCents || paidCents < expectedCents) throw new HttpError(409, "The Stripe payment amount does not match the booking total.");

  const paidAt = new Date().toISOString();
  const scheduledAt = booking.scheduled_start_at ? new Date(booking.scheduled_start_at) : new Date();
  const availableAt = new Date(scheduledAt.getTime() - 30 * 60 * 1000);
  const expiresAt = new Date(scheduledAt.getTime() + (Number(booking.duration_minutes || 60) + 60) * 60 * 1000);
  const { error: updateError } = await supabase
    .from("call_bookings")
    .update({
      status: "paid",
      payment_status: "paid",
      payment_intent_id: stripeId(object.payment_intent),
      paid_at: paidAt,
      room_token: crypto.randomUUID().replace(/-/g, ""),
      join_available_at: availableAt.toISOString(),
      join_expires_at: expiresAt.toISOString(),
      meeting_url: null,
    })
    .eq("id", booking.id);
  if (updateError) throw new HttpError(500, updateError.message || "The paid booking could not be activated.");
  await sendBookingConfirmation(supabase, booking, availableAt.toISOString());
}

async function sendBookingConfirmation(
  supabase: ReturnType<typeof supabaseService>,
  booking: Record<string, any>,
  availableAt: string
): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY || "";
  if (!resendKey || !booking.customer_email) return;
  try {
    const { data } = await supabase.from("site_settings").select("value").eq("key", "public_content").maybeSingle();
    const content = data?.value && typeof data.value === "object" ? (data.value as Record<string, unknown>) : {};
    const fromName = cleanHeader(content.emailFromName, "DiagnosticaOnline");
    const fromAddress = cleanEmail(content.emailFromAddress) || "verify@diagnostica-online.com";
    const supportEmail = cleanEmail(content.supportEmail) || fromAddress;
    const subject = cleanHeader(content.bookingConfirmationSubject, "Your DiagnosticaOnline mechanic booking");
    const siteUrl = String(process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || CANONICAL_SITE_URL).replace(/\/+$/, "");
    const sessionTime = booking.scheduled_start_at ? new Date(booking.scheduled_start_at).toLocaleString("en-GB", { timeZone: "UTC", timeZoneName: "short" }) : "As soon as payment is confirmed";
    const resend = new Resend(resendKey);
    const customerResult = await resend.emails.send({
      from: `${fromName} <${fromAddress}>`,
      to: [booking.customer_email],
      subject,
      replyTo: supportEmail,
      html: bookingEmailHtml({ booking, sessionTime, availableAt, siteUrl }),
      text: bookingEmailText({ booking, sessionTime, availableAt, siteUrl }),
    });
    if (customerResult.error) throw new Error(customerResult.error.message);

    const staffEmail = cleanEmail(content.staffNotificationEmail);
    if (staffEmail) {
      await resend.emails.send({
        from: `${fromName} <${fromAddress}>`,
        to: [staffEmail],
        subject: `Paid ${booking.call_type} booking: ${sessionTime}`,
        replyTo: booking.customer_email,
        html: bookingEmailHtml({ booking, sessionTime, availableAt, siteUrl, staff: true }),
        text: bookingEmailText({ booking, sessionTime, availableAt, siteUrl, staff: true }),
      });
    }
    await supabase.from("call_bookings").update({ confirmation_email_sent_at: new Date().toISOString(), notification_error: null }).eq("id", booking.id);
  } catch (error) {
    await supabase
      .from("call_bookings")
      .update({ notification_error: safeWebhookError(error) })
      .eq("id", booking.id);
  }
}

function bookingEmailHtml({ booking, sessionTime, availableAt, siteUrl, staff = false }: Record<string, any>): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f7f8;color:#18212a;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:28px 12px"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #dce7eb"><tr><td style="background:#10262d;color:#fff;padding:24px"><strong style="color:#57c7d9">DiagnosticaOnline</strong><h1 style="font-size:24px;margin:8px 0 0">${staff ? "Paid booking received" : "Your booking is confirmed"}</h1></td></tr><tr><td style="padding:26px;line-height:1.6"><p><strong>${escapeHtml(String(booking.call_type).toUpperCase())} session</strong><br>${escapeHtml(String(booking.duration_minutes))} minutes - $${escapeHtml(Number(booking.total_usd).toFixed(2))}</p><p>Scheduled: ${escapeHtml(sessionTime)}<br>Room access opens: ${escapeHtml(new Date(availableAt).toLocaleString("en-GB", { timeZone: "UTC", timeZoneName: "short" }))}</p><p>${staff ? `Customer: ${escapeHtml(booking.customer_email)}` : "Log in and use the Live sessions panel to join. The room link is released only during the access window."}</p><a href="${escapeHtml(siteUrl)}" style="display:inline-block;background:#f17363;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px">Open DiagnosticaOnline</a></td></tr></table></td></tr></table></body></html>`;
}

function bookingEmailText({ booking, sessionTime, availableAt, siteUrl, staff = false }: Record<string, any>): string {
  return [
    staff ? "DiagnosticaOnline paid booking received" : "Your DiagnosticaOnline booking is confirmed",
    "",
    `${String(booking.call_type).toUpperCase()} - ${booking.duration_minutes} minutes - $${Number(booking.total_usd).toFixed(2)}`,
    `Scheduled: ${sessionTime}`,
    `Room access opens: ${new Date(availableAt).toLocaleString("en-GB", { timeZone: "UTC", timeZoneName: "short" })}`,
    staff ? `Customer: ${booking.customer_email}` : "Log in and use Live sessions to join during the access window.",
    siteUrl,
  ].join("\n");
}

async function activatePremiumFromCheckout(object: Record<string, any>, supabase: ReturnType<typeof supabaseService>): Promise<void> {
  const userId = cleanUuid(object.metadata?.userId || object.client_reference_id);
  if (!userId) throw new HttpError(400, "Premium checkout metadata does not identify a user.");
  if (object.payment_status && !["paid", "no_payment_required"].includes(object.payment_status)) return;
  if (await isAdmin(userId, supabase)) return;

  const { error } = await supabase.from("user_plans").upsert(
    {
      user_id: userId,
      plan_tier: "premium",
      status: "active",
      provider_customer_id: stripeId(object.customer) || null,
      provider_subscription_id: stripeId(object.subscription) || null,
      starts_at: new Date().toISOString(),
      ends_at: null,
    },
    { onConflict: "user_id" }
  );
  if (error) throw new HttpError(500, error.message || "The Premium plan could not be activated.");
}

async function synchronizeSubscription(
  object: Record<string, any>,
  supabase: ReturnType<typeof supabaseService>,
  deleted: boolean
): Promise<void> {
  const subscriptionId = stripeId(object.id);
  const customerId = stripeId(object.customer);
  let userId = cleanUuid(object.metadata?.userId);
  if (!userId && subscriptionId) {
    const { data } = await supabase.from("user_plans").select("user_id").eq("provider_subscription_id", subscriptionId).maybeSingle();
    userId = cleanUuid(data?.user_id);
  }
  if (!userId && customerId) {
    const { data } = await supabase.from("user_plans").select("user_id").eq("provider_customer_id", customerId).maybeSingle();
    userId = cleanUuid(data?.user_id);
  }
  if (!userId || (await isAdmin(userId, supabase))) return;

  const status = deleted ? "canceled" : planStatus(object.status);
  const premiumActive = status === "active" || status === "trialing";
  const periodEnd = Number(object.current_period_end || 0);
  const endsAt = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
  const { error } = await supabase.from("user_plans").upsert(
    {
      user_id: userId,
      plan_tier: premiumActive ? "premium" : "free",
      status,
      provider_customer_id: customerId || null,
      provider_subscription_id: subscriptionId || null,
      starts_at: object.start_date ? new Date(Number(object.start_date) * 1000).toISOString() : new Date().toISOString(),
      ends_at: endsAt,
    },
    { onConflict: "user_id" }
  );
  if (error) throw new HttpError(500, error.message || "The subscription state could not be synchronized.");
}

async function isAdmin(userId: string, supabase: ReturnType<typeof supabaseService>): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role === "admin";
}

function planStatus(value: unknown): "active" | "trialing" | "past_due" | "canceled" {
  const status = String(value || "");
  if (status === "active" || status === "trialing") return status;
  if (["past_due", "unpaid", "incomplete", "paused"].includes(status)) return "past_due";
  return "canceled";
}

function cleanUuid(value: unknown): string {
  const text = String(value || "");
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : "";
}

function cleanEmail(value: unknown): string {
  const text = String(value || "").trim().toLowerCase();
  return text.length <= 254 && /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(text) ? text : "";
}

function cleanHeader(value: unknown, fallback: string): string {
  const text = String(value || "").replace(/[\r\n<>]+/g, " ").trim().slice(0, 120);
  return text || fallback;
}

function escapeHtml(value: unknown): string {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeWebhookError(error: unknown): string {
  return (error instanceof Error ? error.message : "Stripe webhook processing failed.").replace(/[\r\n]+/g, " ").slice(0, 1000);
}
