import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { canonicalSiteOrigin } from "@/lib/platform/site-url";

export const runtime = "nodejs";

const DEFAULT_SITE_CONTENT = {
  emailFromName: "DiagnosticaOnline",
  emailFromAddress: "verify@diagnostica-online.com",
  emailSubject: "Verify your DiagnosticaOnline account",
  emailIntro: "Confirm your email so your mechanic conversations stay saved to your account.",
};

const EMAIL_COPY = {
  en: {
    subject: "Verify your DiagnosticaOnline account",
    intro: "Confirm your email so your diagnostic cases stay saved to your account.",
    title: "Confirm your email",
    button: "Verify account",
    fallback: "If the button does not work, paste this link into your browser:",
    ignore: "You can ignore this email if you did not create an account.",
    success: "Check your email for the DiagnosticaOnline verification link, then log in.",
  },
  es: {
    subject: "Verifica tu cuenta de DiagnosticaOnline",
    intro: "Confirma tu correo para guardar tus casos de diagnóstico en tu cuenta.",
    title: "Confirma tu correo",
    button: "Verificar cuenta",
    fallback: "Si el botón no funciona, pega este enlace en el navegador:",
    ignore: "Puedes ignorar este correo si no has creado una cuenta.",
    success: "Revisa tu correo para verificar la cuenta de DiagnosticaOnline y después inicia sesión.",
  },
  ro: {
    subject: "Verifică-ți contul DiagnosticaOnline",
    intro: "Confirmă adresa de e-mail pentru ca diagnosticările să rămână salvate în cont.",
    title: "Confirmă adresa de e-mail",
    button: "Verifică contul",
    fallback: "Dacă butonul nu funcționează, copiază acest link în browser:",
    ignore: "Poți ignora acest e-mail dacă nu ai creat un cont.",
    success: "Verifică e-mailul pentru linkul DiagnosticaOnline, apoi autentifică-te.",
  },
  "ca-valencia": {
    subject: "Verifica el teu compte de DiagnosticaOnline",
    intro: "Confirma el correu perquè els casos de diagnòstic queden guardats en el teu compte.",
    title: "Confirma el correu",
    button: "Verifica el compte",
    fallback: "Si el botó no funciona, apega este enllaç en el navegador:",
    ignore: "Pots ignorar este correu si no has creat un compte.",
    success: "Revisa el correu per a verificar el compte de DiagnosticaOnline i després inicia sessió.",
  },
};

export async function POST(request) {
  try {
    const body = await request.json();
    const email = cleanEmail(body.email);
    const password = String(body.password || "");
    const language = normalizeLanguage(body.language);

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
    const siteUrl = canonicalSiteOrigin(request);
    const redirectTo = `${siteUrl}/verify`;

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        redirectTo,
        data: {
          display_name: email.split("@")[0],
          preferred_language: language,
        },
      },
    });

    if (error) {
      if (isDuplicateUser(error)) {
        return json({ ok: true, message: EMAIL_COPY[language].success });
      }
      return json({ error: safeError(error.message, "Could not create the verification link.") }, 400);
    }

    const generatedActionLink = data?.properties?.action_link || data?.action_link;
    if (!generatedActionLink) {
      return json({ error: "Supabase did not return a verification link." }, 502);
    }
    const actionLink = verificationActionLink(generatedActionLink, redirectTo);
    const copy = localizedEmailCopy(siteContent, language);

    const resend = new Resend(resendKey);
    const emailHtml = verificationEmailHtml({
      actionLink,
      intro: copy.intro,
      siteUrl,
      copy,
    });
    const emailText = verificationEmailText({
      actionLink,
      intro: copy.intro,
      siteUrl,
      copy,
    });

    const sent = await resend.emails.send({
      from: formatFrom(siteContent),
      to: [email],
      subject: copy.subject,
      html: emailHtml,
      text: emailText,
    });

    if (sent.error) {
      return json({ error: safeError(sent.error.message, "Could not send the verification email.") }, 502);
    }

    return json({ ok: true, message: EMAIL_COPY[language].success });
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

function verificationEmailHtml({ actionLink, intro, siteUrl, copy }) {
  const safeActionLink = escapeAttr(actionLink);
  const safeIntro = escapeHtml(intro);
  const safeSiteUrl = escapeHtml(siteUrl);

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f7f8;color:#18212a;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;">Verify your DiagnosticaOnline account.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f8;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dce7eb;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:#10262d;padding:28px 32px;color:#ffffff;">
                <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#57c7d9;">DiagnosticaOnline</div>
                <h1 style="margin:8px 0 0;font-size:28px;line-height:1.15;">${escapeHtml(copy.title)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 22px;font-size:16px;line-height:1.6;">${safeIntro}</p>
                <a href="${safeActionLink}" style="display:inline-block;background:#f17363;color:#ffffff;text-decoration:none;font-weight:800;border-radius:8px;padding:14px 22px;">${escapeHtml(copy.button)}</a>
                <p style="margin:28px 0 0;color:#52616b;font-size:14px;line-height:1.6;">${escapeHtml(copy.fallback)}</p>
                <p style="word-break:break-all;color:#0f7f95;font-size:13px;line-height:1.5;">${safeActionLink}</p>
                <p style="margin:28px 0 0;color:#52616b;font-size:13px;line-height:1.5;">DiagnosticaOnline: ${safeSiteUrl}. ${escapeHtml(copy.ignore)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function verificationEmailText({ actionLink, intro, siteUrl, copy }) {
  return [
    copy.subject,
    "",
    intro,
    "",
    `${copy.button}: ${actionLink}`,
    "",
    `DiagnosticaOnline: ${siteUrl}. ${copy.ignore}`,
  ].join("\n");
}

function localizedEmailCopy(siteContent, language) {
  const copy = EMAIL_COPY[language];
  return {
    ...copy,
    subject: siteContent.emailSubject === DEFAULT_SITE_CONTENT.emailSubject ? copy.subject : siteContent.emailSubject,
    intro: siteContent.emailIntro === DEFAULT_SITE_CONTENT.emailIntro ? copy.intro : siteContent.emailIntro,
  };
}

function normalizeLanguage(value) {
  const language = String(value || "en").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(EMAIL_COPY, language) ? language : "en";
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

function verificationActionLink(value, redirectTo) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return value;
    url.searchParams.set("redirect_to", redirectTo);
    return url.toString();
  } catch {
    return value;
  }
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
