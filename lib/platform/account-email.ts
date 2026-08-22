import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export type AccountEmailKind = "verification" | "recovery";
export type SupportedLanguage = "en" | "es" | "ro" | "ca-valencia";

interface SiteEmailContent {
  emailFromName: string;
  emailFromAddress: string;
  emailSubject: string;
  emailIntro: string;
  passwordResetSubject: string;
  passwordResetIntro: string;
  supportEmail: string;
}

interface LocalizedCopy {
  subject: string;
  intro: string;
  title: string;
  button: string;
  fallback: string;
  ignore: string;
  success: string;
}

const DEFAULT_CONTENT: SiteEmailContent = {
  emailFromName: "DiagnosticaOnline",
  emailFromAddress: "verify@diagnostica-online.com",
  emailSubject: "Verify your DiagnosticaOnline account",
  emailIntro: "Confirm your email so your mechanic conversations stay saved to your account.",
  passwordResetSubject: "Reset your DiagnosticaOnline password",
  passwordResetIntro: "Use this secure link to choose a new password for your DiagnosticaOnline account.",
  supportEmail: "support@diagnostica-online.com",
};

const COPY: Record<SupportedLanguage, Record<AccountEmailKind, LocalizedCopy>> = {
  en: {
    verification: {
      subject: "Verify your DiagnosticaOnline account",
      intro: "Confirm your email so your diagnostic cases stay saved to your account.",
      title: "Confirm your email",
      button: "Verify account",
      fallback: "If the button does not work, paste this link into your browser:",
      ignore: "You can ignore this email if you did not create an account.",
      success: "Check your email for the DiagnosticaOnline verification link.",
    },
    recovery: {
      subject: "Reset your DiagnosticaOnline password",
      intro: "Use this secure link to choose a new password for your DiagnosticaOnline account.",
      title: "Reset your password",
      button: "Choose a new password",
      fallback: "If the button does not work, paste this link into your browser:",
      ignore: "You can ignore this email if you did not request a password reset.",
      success: "If that account exists, a password reset link is on its way.",
    },
  },
  es: {
    verification: {
      subject: "Verifica tu cuenta de DiagnosticaOnline",
      intro: "Confirma tu correo para guardar tus casos de diagnóstico en tu cuenta.",
      title: "Confirma tu correo",
      button: "Verificar cuenta",
      fallback: "Si el botón no funciona, pega este enlace en el navegador:",
      ignore: "Puedes ignorar este correo si no has creado una cuenta.",
      success: "Revisa tu correo para verificar la cuenta de DiagnosticaOnline.",
    },
    recovery: {
      subject: "Restablece tu contraseña de DiagnosticaOnline",
      intro: "Usa este enlace seguro para elegir una contraseña nueva.",
      title: "Restablece tu contraseña",
      button: "Elegir contraseña nueva",
      fallback: "Si el botón no funciona, pega este enlace en el navegador:",
      ignore: "Puedes ignorar este correo si no has solicitado restablecer la contraseña.",
      success: "Si la cuenta existe, recibirás un enlace para restablecer la contraseña.",
    },
  },
  ro: {
    verification: {
      subject: "Verifică-ți contul DiagnosticaOnline",
      intro: "Confirmă adresa de e-mail pentru ca diagnosticările să rămână salvate în cont.",
      title: "Confirmă adresa de e-mail",
      button: "Verifică contul",
      fallback: "Dacă butonul nu funcționează, copiază acest link în browser:",
      ignore: "Poți ignora acest e-mail dacă nu ai creat un cont.",
      success: "Verifică e-mailul pentru linkul DiagnosticaOnline.",
    },
    recovery: {
      subject: "Resetează parola DiagnosticaOnline",
      intro: "Folosește acest link securizat pentru a alege o parolă nouă.",
      title: "Resetează parola",
      button: "Alege o parolă nouă",
      fallback: "Dacă butonul nu funcționează, copiază acest link în browser:",
      ignore: "Poți ignora acest e-mail dacă nu ai solicitat resetarea parolei.",
      success: "Dacă acel cont există, vei primi un link pentru resetarea parolei.",
    },
  },
  "ca-valencia": {
    verification: {
      subject: "Verifica el teu compte de DiagnosticaOnline",
      intro: "Confirma el correu perquè els casos de diagnòstic queden guardats en el teu compte.",
      title: "Confirma el correu",
      button: "Verifica el compte",
      fallback: "Si el botó no funciona, apega este enllaç en el navegador:",
      ignore: "Pots ignorar este correu si no has creat un compte.",
      success: "Revisa el correu per a verificar el compte de DiagnosticaOnline.",
    },
    recovery: {
      subject: "Restablix la contrasenya de DiagnosticaOnline",
      intro: "Usa este enllaç segur per a triar una contrasenya nova.",
      title: "Restablix la contrasenya",
      button: "Triar una contrasenya nova",
      fallback: "Si el botó no funciona, apega este enllaç en el navegador:",
      ignore: "Pots ignorar este correu si no has demanat restablir la contrasenya.",
      success: "Si el compte existix, rebràs un enllaç per a restablir la contrasenya.",
    },
  },
};

export async function loadSiteEmailContent(supabase: SupabaseClient): Promise<SiteEmailContent> {
  const { data } = await supabase.from("site_settings").select("value").eq("key", "public_content").maybeSingle();
  const value = data?.value && typeof data.value === "object" && !Array.isArray(data.value) ? data.value as Record<string, unknown> : {};
  return {
    emailFromName: cleanHeader(value.emailFromName, DEFAULT_CONTENT.emailFromName, 80),
    emailFromAddress: cleanEmail(value.emailFromAddress) || DEFAULT_CONTENT.emailFromAddress,
    emailSubject: cleanHeader(value.emailSubject, DEFAULT_CONTENT.emailSubject, 120),
    emailIntro: cleanBody(value.emailIntro, DEFAULT_CONTENT.emailIntro, 500),
    passwordResetSubject: cleanHeader(value.passwordResetSubject, DEFAULT_CONTENT.passwordResetSubject, 120),
    passwordResetIntro: cleanBody(value.passwordResetIntro, DEFAULT_CONTENT.passwordResetIntro, 500),
    supportEmail: cleanEmail(value.supportEmail) || DEFAULT_CONTENT.supportEmail,
  };
}

export async function sendAccountEmail(options: {
  resendKey: string;
  to: string;
  actionLink: string;
  siteUrl: string;
  language: SupportedLanguage;
  kind: AccountEmailKind;
  content: SiteEmailContent;
}): Promise<string | null> {
  const copy = customizedCopy(options.content, options.language, options.kind);
  const resend = new Resend(options.resendKey);
  const result = await resend.emails.send({
    from: `${options.content.emailFromName} <${options.content.emailFromAddress}>`,
    to: [options.to],
    replyTo: options.content.supportEmail,
    subject: copy.subject,
    html: renderHtml(options.actionLink, options.siteUrl, copy),
    text: renderText(options.actionLink, options.siteUrl, copy),
  });
  if (result.error) throw new Error("The account email could not be sent.");
  return result.data?.id || null;
}

export function accountEmailSuccess(language: SupportedLanguage, kind: AccountEmailKind): string {
  return COPY[language][kind].success;
}

export function normalizeLanguage(value: unknown): SupportedLanguage {
  const language = String(value || "en").trim().toLowerCase();
  return language in COPY ? language as SupportedLanguage : "en";
}

export function cleanAccountEmail(value: unknown): string {
  return cleanEmail(value);
}

export function rewriteActionLink(value: string, redirectTo: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return value;
    url.searchParams.set("redirect_to", redirectTo);
    return url.toString();
  } catch {
    return value;
  }
}

function customizedCopy(content: SiteEmailContent, language: SupportedLanguage, kind: AccountEmailKind): LocalizedCopy {
  const copy = COPY[language][kind];
  const defaultSubject = kind === "verification" ? DEFAULT_CONTENT.emailSubject : DEFAULT_CONTENT.passwordResetSubject;
  const defaultIntro = kind === "verification" ? DEFAULT_CONTENT.emailIntro : DEFAULT_CONTENT.passwordResetIntro;
  const customSubject = kind === "verification" ? content.emailSubject : content.passwordResetSubject;
  const customIntro = kind === "verification" ? content.emailIntro : content.passwordResetIntro;
  return {
    ...copy,
    subject: customSubject === defaultSubject ? copy.subject : customSubject,
    intro: customIntro === defaultIntro ? copy.intro : customIntro,
  };
}

function renderHtml(actionLink: string, siteUrl: string, copy: LocalizedCopy): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f7f8;color:#18212a;font-family:Arial,Helvetica,sans-serif;"><div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(copy.intro)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f8;padding:32px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dce7eb;border-radius:12px;overflow:hidden;"><tr><td style="background:#10262d;padding:28px 32px;color:#ffffff;"><div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#57c7d9;">DiagnosticaOnline</div><h1 style="margin:8px 0 0;font-size:28px;line-height:1.15;">${escapeHtml(copy.title)}</h1></td></tr><tr><td style="padding:32px;"><p style="margin:0 0 22px;font-size:16px;line-height:1.6;">${escapeHtml(copy.intro)}</p><a href="${escapeHtml(actionLink)}" style="display:inline-block;background:#f17363;color:#ffffff;text-decoration:none;font-weight:800;border-radius:8px;padding:14px 22px;">${escapeHtml(copy.button)}</a><p style="margin:28px 0 0;color:#52616b;font-size:14px;line-height:1.6;">${escapeHtml(copy.fallback)}</p><p style="word-break:break-all;color:#0f7f95;font-size:13px;line-height:1.5;">${escapeHtml(actionLink)}</p><p style="margin:28px 0 0;color:#52616b;font-size:13px;line-height:1.5;">DiagnosticaOnline: ${escapeHtml(siteUrl)}. ${escapeHtml(copy.ignore)}</p></td></tr></table></td></tr></table></body></html>`;
}

function renderText(actionLink: string, siteUrl: string, copy: LocalizedCopy): string {
  return [copy.subject, "", copy.intro, "", `${copy.button}: ${actionLink}`, "", `DiagnosticaOnline: ${siteUrl}. ${copy.ignore}`].join("\n");
}

function cleanEmail(value: unknown): string {
  const text = String(value || "").trim().toLowerCase();
  if (text.length > 254) return "";
  return /^[^\s@<>\"]+@[^\s@<>\"]+\.[^\s@<>\"]+$/.test(text) ? text : "";
}

function cleanHeader(value: unknown, fallback: string, maxLength: number): string {
  return String(value || "").replace(/[\r\n]+/g, " ").replace(/[<>]/g, "").trim().slice(0, maxLength) || fallback;
}

function cleanBody(value: unknown, fallback: string, maxLength: number): string {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength) || fallback;
}

function escapeHtml(value: unknown): string {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;").replaceAll("`", "&#096;");
}
