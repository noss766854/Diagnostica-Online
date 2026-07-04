import { requireActiveUser } from "@/lib/platform/auth";
import { errorResponse, HttpError, json } from "@/lib/platform/http";
import { supabaseService } from "@/lib/platform/supabase";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ bookingId: string }>;
}

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  try {
    const { bookingId } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(bookingId)) throw new HttpError(400, "A valid booking ID is required.");
    const context = await requireActiveUser(request);
    const supabase = supabaseService();
    const { data: booking, error } = await supabase
      .from("call_bookings")
      .select("id,owner_id,call_type,status,payment_status,room_token,join_available_at,join_expires_at")
      .eq("id", bookingId)
      .eq("owner_id", context.user.id)
      .maybeSingle();
    if (error || !booking) throw new HttpError(404, "Booking not found.");
    if (booking.status !== "paid" || booking.payment_status !== "paid" || !booking.room_token) {
      throw new HttpError(403, "The meeting room becomes available only after Stripe confirms payment.");
    }

    const now = Date.now();
    const availableAt = booking.join_available_at ? new Date(booking.join_available_at).getTime() : Number.POSITIVE_INFINITY;
    const expiresAt = booking.join_expires_at ? new Date(booking.join_expires_at).getTime() : 0;
    if (now < availableAt) throw new HttpError(425, `The room opens at ${new Date(availableAt).toISOString()}.`);
    if (!expiresAt || now > expiresAt) throw new HttpError(410, "This meeting access window has ended.");

    const { data: setting } = await supabase.from("site_settings").select("value").eq("key", "public_content").maybeSingle();
    const content = setting?.value && typeof setting.value === "object" ? (setting.value as Record<string, unknown>) : {};
    const domain = cleanDomain(content.jitsiDomain, process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si");
    const room = `DiagnosticaOnline-${booking.call_type}-${booking.room_token}`.replace(/[^a-z0-9-]/gi, "");
    const meetingUrl = `https://${domain}/${room}#config.startWithVideoMuted=${booking.call_type === "voice"}`;
    return json({ url: meetingUrl, expiresAt: booking.join_expires_at });
  } catch (error) {
    return errorResponse(error, "Meeting access could not be opened.");
  }
}

function cleanDomain(value: unknown, fallback: string): string {
  const domain = String(value || fallback)
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/[^a-z0-9.-]/gi, "");
  return domain || "meet.jit.si";
}
