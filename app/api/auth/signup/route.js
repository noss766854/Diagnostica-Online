import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const runtime = "nodejs";

const DEFAULT_SITE_CONTENT = {
  emailFromName: "Diagnostica Online",
  emailFromAddress: "verify@diagnostica-online.com",
  emailSubject: "Verify your Diagnostica Online account",
  emailIntro: "Confirm your email so your mechanic conversations stay saved to your account.",
};

const SUCCESS_MESSAGE = "Check your email for the Diagnostica Online verification link, then log in.";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = cleanEmail(body.email);
    const password = String(body.password || "");

    if (!email) {
      return json({ error: "Enter a valid email address." }, 400);
    }
    if (password.length < 6) {
      return json({ error: "Password must be at least 6 characters." }, 400);
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendKey = process.env.RESEND_API_KEY;

    if (!supabaseUrl || !serviceRoleKey || !resendKey) {
      return json(
        {
          error:
            "Custom signup email is not configured yet. Add SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and RESEND_API_KEY in Vercel.",
        },
        503
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const siteContent = await loadSiteContent(supabase);
    const redirectTo = `${siteOrigin(request)}/verify`;

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        redirectTo,
        data: {
          display_name: email.split("@")[0],
        },
      },
    });

    if (error) {
      if (isDuplicateUser(error)) {
        return json({ ok: true, message: SUCCESS_MESSAGE });
      }
      return json({ error: safeError(error.message, "Could not create the verification link.") }, 400);
    }

    const actionLink = data?.properties?.action_link || data?.action_link;
    if (!actionLink) {
      return json({ error: "Supabase did not return a verification link." }, 502);
    }

    const resend = new Resend(resendKey);
    const emailHtml = verificationEmailHtml({
      actionLink,
      intro: siteContent.emailIntro,
      siteUrl: siteOrigin(request),
    });
    const emailText = verificationEmailText({
      actionLink,
      intro: siteContent.emailIntro,
      siteUrl: siteOrigin(request),
    });

    const sent = await resend.emails.send({
      from: formatFrom(siteContent),
      to: [email],
      subject: siteContent.emailSubject,
      html: emailHtml,
      text: emailText,
    });

    if (sent.error) {
      return json({ error: safeError(sent.error.message, "Could not send the verification email.") }, 502);
    }

    return json({ ok: true, message: SUCCESS_MESSAGE });
  } catch (error) {
    return json({ error: error instanceof Error ? safeError(error.message, "Signup failed.") : "Signup failed." }, 500);
  }
}

async function loadSiteContent(supabase) {
  try {
    const { data, error } = await supabase.from("site_settings").select("value").eq("key", "public_content").maybeSingle();
    if (error) throw error;
    return sanitizeSiteContent(data?.value);
  } catch (error) {
    return sanitizeSiteContent({});
  }
}

function sanitizeSiteContent(value) {
  const merged = { ...DEFAULT_SITE_CONTENT, ...(value && typeof value === "object" ? value : {}) };
  return {
    emailFromName: cleanHeaderText(merged.emailFromName, DEFAULT_SITE_CONTENT.emailFromName, 80),
    emailFromAddress: cleanEmail(merged.emailFromAddress) || DEFAULT_SITE_CONTENT.emailFromAddress,
    emailSubject: cleanHeaderText(merged.emailSubject, DEFAULT_SITE_CONTENT.emailSubject, 120),
    emailIntro: cleanBodyText(merged.emailIntro, DEFAULT_SITE_CONTENT.emailIntro, 500),
  };
}

function verificationEmailHtml({ actionLink, intro, siteUrl }) {
  const safeActionLink = escapeAttr(actionLink);
  const safeIntro = escapeHtml(intro);
  const safeSiteUrl = escapeHtml(siteUrl);

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f7f8;color:#18212a;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;">Verify your Diagnostica Online account.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f8;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dce7eb;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#10262d;padding:28px 32px;color:#ffffff;">
                <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#57c7d9;">Diagnostica Online</div>
                <h1 style="margin:8px 0 0;font-size:28px;line-height:1.15;">Confirm your email</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 22px;font-size:16px;line-height:1.6;">${safeIntro}</p>
                <a href="${safeActionLink}" style="display:inline-block;background:#f17363;color:#ffffff;text-decoration:none;font-weight:800;border-radius:8px;padding:14px 22px;">Verify account</a>
                <p style="margin:28px 0 0;color:#52616b;font-size:14px;line-height:1.6;">If the button does not work, paste this link into your browser:</p>
                <p style="word-break:break-all;color:#0f7f95;font-size:13px;line-height:1.5;">${safeActionLink}</p>
                <p style="margin:28px 0 0;color:#52616b;font-size:13px;line-height:1.5;">This request came from ${safeSiteUrl}. You can ignore this email if you did not create an account.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function verificationEmailText({ actionLink, intro, siteUrl }) {
  return [
    "Diagnostica Online email verification",
    "",
    intro,
    "",
    `Verify your account: ${actionLink}`,
    "",
    `This request came from ${siteUrl}. Ignore this email if you did not create an account.`,
  ].join("\n");
}

function formatFrom(siteContent) {
  return `${siteContent.emailFromName} <${siteContent.emailFromAddress}>`;
}

function cleanEmail(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text.length > 254) return "";
  return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(text) ? text : "";
}

function cleanHeaderText(value, fallback, maxLength) {
  const text = String(value || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
  return text || fallback;
}

function cleanBodyText(value, fallback, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
  return text || fallback;
}

function siteOrigin(request) {
  const configured =
    process.env.PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_URL ||
    new URL(request.url).origin;
  const withProtocol = /^https?:\/\//i.test(configured) ? configured : `https://${configured}`;
  return withProtocol.replace(/\/+$/, "");
}

function isDuplicateUser(error) {
  return /already|registered|exists/i.test(error?.message || "");
}

function safeError(message, fallback) {
  const text = String(message || "").replace(/[\r\n]+/g, " ").trim();
  return text ? text.slice(0, 180) : fallback;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function json(payload, status = 200) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
