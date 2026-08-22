import { z } from "zod";
import {
  accountEmailSuccess,
  cleanAccountEmail,
  loadSiteEmailContent,
  normalizeLanguage,
  rewriteActionLink,
  sendAccountEmail,
} from "@/lib/platform/account-email";
import { finishAccountEmail, reserveAccountEmail } from "@/lib/platform/email-rate-limit";
import { errorResponse, HttpError, json } from "@/lib/platform/http";
import { canonicalSiteOrigin } from "@/lib/platform/site-url";
import { supabaseService } from "@/lib/platform/supabase";

export const runtime = "nodejs";

const RecoverySchema = z.object({
  email: z.string().trim().max(254),
  language: z.string().optional(),
});

export async function POST(request: Request): Promise<Response> {
  let reservation: Awaited<ReturnType<typeof reserveAccountEmail>> | null = null;
  try {
    const parsed = RecoverySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) throw new HttpError(400, "Enter a valid email address.");
    const email = cleanAccountEmail(parsed.data.email);
    if (!email) throw new HttpError(400, "Enter a valid email address.");
    const language = normalizeLanguage(parsed.data.language);
    const resendKey = process.env.RESEND_API_KEY || "";
    if (!resendKey) throw new HttpError(503, "Account email is not configured yet.");

    const supabase = supabaseService();
    reservation = await reserveAccountEmail(supabase, request, email, "recovery");
    const siteUrl = canonicalSiteOrigin(request);
    const redirectTo = `${siteUrl}/reset-password`;
    const generated = await supabase.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });

    if (generated.error || !generated.data?.properties?.action_link) {
      await finishAccountEmail(supabase, reservation, "ignored");
      return json({ ok: true, message: accountEmailSuccess(language, "recovery") });
    }

    const content = await loadSiteEmailContent(supabase);
    const providerMessageId = await sendAccountEmail({
      resendKey,
      to: email,
      actionLink: rewriteActionLink(generated.data.properties.action_link, redirectTo),
      siteUrl,
      language,
      kind: "recovery",
      content,
    });
    await finishAccountEmail(supabase, reservation, "sent", providerMessageId);
    return json({ ok: true, message: accountEmailSuccess(language, "recovery") });
  } catch (error) {
    if (reservation) {
      try {
        await finishAccountEmail(supabaseService(), reservation, "failed");
      } catch {
        // Preserve the original account-email error.
      }
    }
    return errorResponse(error);
  }
}
