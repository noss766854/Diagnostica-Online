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

const SignupSchema = z.object({
  email: z.string().trim().max(254),
  password: z.string().min(8, "Password must be at least 8 characters.").max(72, "Password must be 72 characters or fewer."),
  language: z.string().optional(),
});

export async function POST(request: Request): Promise<Response> {
  let reservation: Awaited<ReturnType<typeof reserveAccountEmail>> | null = null;
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || typeof body.email !== "string") throw new HttpError(400, "Enter a valid email address.");
    if (typeof body.password !== "string") throw new HttpError(400, "Enter a password with at least 8 characters.");
    const parsed = SignupSchema.safeParse(body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message || "Enter valid account details.");

    const email = cleanAccountEmail(parsed.data.email);
    if (!email) throw new HttpError(400, "Enter a valid email address.");
    const language = normalizeLanguage(parsed.data.language);
    const resendKey = process.env.RESEND_API_KEY || "";
    if (!resendKey) throw new HttpError(503, "Account email is not configured yet.");

    const supabase = supabaseService();
    reservation = await reserveAccountEmail(supabase, request, email, "signup");
    const siteUrl = canonicalSiteOrigin(request);
    const redirectTo = `${siteUrl}/verify`;

    let generated = await supabase.auth.admin.generateLink({
      type: "signup",
      email,
      password: parsed.data.password,
      options: {
        redirectTo,
        data: {
          display_name: email.split("@")[0],
          preferred_language: language,
        },
      },
    });

    if (generated.error && isDuplicateUser(generated.error.message)) {
      generated = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      });
    }
    if (generated.error) throw new HttpError(400, safeError(generated.error.message, "Could not create the verification link."));

    const generatedActionLink = generated.data?.properties?.action_link;
    if (!generatedActionLink) throw new HttpError(502, "The verification link could not be created.");
    const content = await loadSiteEmailContent(supabase);
    const providerMessageId = await sendAccountEmail({
      resendKey,
      to: email,
      actionLink: rewriteActionLink(generatedActionLink, redirectTo),
      siteUrl,
      language,
      kind: "verification",
      content,
    });
    await finishAccountEmail(supabase, reservation, "sent", providerMessageId);
    return json({ ok: true, message: accountEmailSuccess(language, "verification") });
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

function isDuplicateUser(message: string): boolean {
  return /already|registered|exists/i.test(message || "");
}

function safeError(message: string, fallback: string): string {
  const text = String(message || "").replace(/[\r\n]+/g, " ").trim();
  return text ? text.slice(0, 180) : fallback;
}
