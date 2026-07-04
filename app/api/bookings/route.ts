import { requireActiveUser } from "@/lib/platform/auth";
import { errorResponse, HttpError, json } from "@/lib/platform/http";
import { supabaseService } from "@/lib/platform/supabase";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const context = await requireActiveUser(request);
    const { data, error } = await supabaseService()
      .from("call_bookings")
      .select("id,call_type,duration_minutes,hourly_rate_usd,total_usd,scheduled_start_at,status,payment_status,paid_at,join_available_at,join_expires_at,created_at")
      .eq("owner_id", context.user.id)
      .in("call_type", ["voice", "video"])
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new HttpError(500, `${error.message}. Run the latest supabase-schema.sql if booking columns are missing.`);

    const now = Date.now();
    const bookings = (data || []).map((booking) => {
      const availableAt = booking.join_available_at ? new Date(booking.join_available_at).getTime() : Number.POSITIVE_INFINITY;
      const expiresAt = booking.join_expires_at ? new Date(booking.join_expires_at).getTime() : 0;
      const canJoin = booking.status === "paid" && now >= availableAt && now <= expiresAt;
      return {
        ...booking,
        can_join: canJoin,
        join_endpoint: canJoin ? `/api/bookings/${booking.id}/meeting` : null,
      };
    });
    return json({ bookings });
  } catch (error) {
    return errorResponse(error, "Bookings could not be loaded.");
  }
}
