import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const runtime = "nodejs";

const DEFAULT_CONTENT = {
  emailFromName: "DiagnosticaOnline",
  emailFromAddress: "verify@diagnostica-online.com",
  supportEmail: "support@diagnostica-online.com",
  staffNotificationEmail: "support@diagnostica-online.com",
  textChatConfirmationSubject: "Your DiagnosticaOnline technician text chat",
  textChatWaitingMessage: "A technician has your case. Keep this page open or check saved cases for replies.",
};

export async function POST(request) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const resendKey = process.env.RESEND_API_KEY || "";

    if (!supabaseUrl || !serviceRoleKey || !resendKey) {
      return json({ error: "Notifications are not configured. Add SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and RESEND_API_KEY in Vercel." }, 503);
    }

    const token = bearerToken(request.headers.get("authorization") || "");
    if (!token) return json({ error: "Login is required." }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "User session could not be verified." }, 401);

    const body = await request.json().catch(() => ({}));
    const type = cleanToken(body.type);
    if (type !== "text_chat_started") return json({ error: "Unsupported notification type." }, 400);

    const siteContent = await loadSiteContent(supabase);
    const conversation = await loadConversation(supabase, body.conversationId, userData.user.id);
    const resend = new Resend(resendKey);
    const sends = [];

    if (siteContent.staffNotificationEmail) {
      sends.push(
        resend.emails.send({
          from: formatFrom(siteContent),
          to: [siteContent.staffNotificationEmail],
          subject: `New free text mechanic case: ${conversation.title}`,
          html: staffTextChatHtml({ conversation, customerEmail: userData.user.email || "", siteUrl: siteOrigin(request) }),
          text: staffTextChatText({ conversation, customerEmail: userData.user.email || "", siteUrl: siteOrigin(request) }),
          replyTo: userData.user.email || siteContent.supportEmail,
        })
      );
    }

    if (userData.user.email) {
      sends.push(
        resend.emails.send({
          from: formatFrom(siteContent),
          to: [userData.user.email],
          subject: siteContent.textChatConfirmationSubject,
          html: customerTextChatHtml({ siteContent, conversation, siteUrl: siteOrigin(request) }),
          text: customerTextChatText({ siteContent, conversation, siteUrl: siteOrigin(request) }),
          replyTo: siteContent.supportEmail,
        })
      );
    }

    const results = await Promise.all(sends);
    const failed = results.find((result) => result?.error);
    if (failed?.error) {
      return json({ error: safeError(failed.error.message, "Notification email could not be sent.") }, 502);
    }

    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof Error ? safeError(error.message, "Notification failed.") : "Notification failed." }, 500);
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

async function loadConversation(supabase, conversationId, ownerId) {
  if (!isUuid(conversationId)) {
    return { title: "Mechanic case", brief: "", vehicle: {}, messages: [] };
  }
  const { data, error } = await supabase
    .from("conversations")
    .select("id,title,brief,vehicle,messages,updated_at")
    .eq("id", conversationId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error || !data) return { title: "Mechanic case", brief: "", vehicle: {}, messages: [] };
  return {
    title: cleanBodyText(data.title, "Mechanic case", 140),
    brief: cleanBodyText(data.brief, "", 2000),
    vehicle: data.vehicle && typeof data.vehicle === "object" ? data.vehicle : {},
    messages: Array.isArray(data.messages) ? data.messages.slice(-8) : [],
  };
}

function sanitizeSiteContent(value) {
  const merged = { ...DEFAULT_CONTENT, ...(value && typeof value === "object" ? value : {}) };
  return {
    emailFromName: cleanHeaderText(merged.emailFromName, DEFAULT_CONTENT.emailFromName, 80),
    emailFromAddress: cleanEmail(merged.emailFromAddress) || DEFAULT_CONTENT.emailFromAddress,
    supportEmail: cleanEmail(merged.supportEmail) || DEFAULT_CONTENT.supportEmail,
    staffNotificationEmail: cleanEmail(merged.staffNotificationEmail) || DEFAULT_CONTENT.staffNotificationEmail,
    textChatConfirmationSubject: cleanHeaderText(merged.textChatConfirmationSubject, DEFAULT_CONTENT.textChatConfirmationSubject, 120),
    textChatWaitingMessage: cleanBodyText(merged.textChatWaitingMessage, DEFAULT_CONTENT.textChatWaitingMessage, 500),
  };
}

function staffTextChatHtml({ conversation, customerEmail, siteUrl }) {
  const safeTitle = escapeHtml(conversation.title);
  const safeEmail = escapeHtml(customerEmail || "Unknown customer");
  const safeBrief = escapeHtml(conversation.brief || "No private brief yet.");
  const safeSiteUrl = escapeHtml(siteUrl);
  const transcript = conversation.messages
    .map((message) => `<li><strong>${escapeHtml(labelForRole(message))}:</strong> ${escapeHtml(message.content || "")}</li>`)
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f7f8;color:#18212a;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f8;padding:28px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #dce7eb;border-radius:12px;overflow:hidden;">
          <tr><td style="background:#10262d;padding:24px 28px;color:#ffffff;">
            <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#57c7d9;">DiagnosticaOnline</div>
            <h1 style="margin:8px 0 0;font-size:24px;line-height:1.2;">Free text chat started</h1>
          </td></tr>
          <tr><td style="padding:28px;">
            <p style="margin:0 0 14px;font-size:16px;"><strong>${safeTitle}</strong></p>
            <p style="margin:0 0 18px;color:#52616b;">Customer: ${safeEmail}</p>
            <h2 style="font-size:16px;margin:24px 0 8px;">Private technician brief</h2>
            <pre style="white-space:pre-wrap;background:#10262d;color:#ffffff;border-radius:8px;padding:14px;font-size:13px;line-height:1.5;">${safeBrief}</pre>
            <h2 style="font-size:16px;margin:24px 0 8px;">Recent transcript</h2>
            <ul style="padding-left:20px;line-height:1.6;">${transcript || "<li>No transcript yet.</li>"}</ul>
            <p style="margin:24px 0 0;color:#52616b;font-size:13px;">Open the admin dashboard at ${safeSiteUrl}/admin to reply.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function staffTextChatText({ conversation, customerEmail, siteUrl }) {
  const transcript = conversation.messages.map((message) => `${labelForRole(message)}: ${message.content || ""}`).join("\n");
  return [
    "DiagnosticaOnline free text chat started",
    "",
    `Case: ${conversation.title}`,
    `Customer: ${customerEmail || "Unknown customer"}`,
    "",
    "Private technician brief:",
    conversation.brief || "No private brief yet.",
    "",
    "Recent transcript:",
    transcript || "No transcript yet.",
    "",
    `Open admin: ${siteUrl}/admin`,
  ].join("\n");
}

function customerTextChatHtml({ siteContent, conversation, siteUrl }) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f7f8;color:#18212a;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f8;padding:28px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dce7eb;border-radius:12px;overflow:hidden;">
          <tr><td style="background:#10262d;padding:24px 28px;color:#ffffff;">
            <div style="font-size:12px;font-weight:800;text-transform:uppercase;color:#57c7d9;">DiagnosticaOnline</div>
            <h1 style="margin:8px 0 0;font-size:24px;line-height:1.2;">Text chat is open</h1>
          </td></tr>
          <tr><td style="padding:28px;">
            <p style="margin:0 0 18px;font-size:16px;line-height:1.6;">${escapeHtml(siteContent.textChatWaitingMessage)}</p>
            <p style="margin:0 0 18px;color:#52616b;">Case: ${escapeHtml(conversation.title)}</p>
            <a href="${escapeAttr(siteUrl)}" style="display:inline-block;background:#f17363;color:#ffffff;text-decoration:none;font-weight:800;border-radius:8px;padding:13px 20px;">Return to case</a>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

function customerTextChatText({ siteContent, conversation, siteUrl }) {
  return [siteContent.textChatWaitingMessage, "", `Case: ${conversation.title}`, `Return to case: ${siteUrl}`].join("\n");
}

function labelForRole(message) {
  if (message.role === "user") return "Customer";
  if (message.technicianReply) return "Technician";
  return "AI";
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

function cleanToken(value) {
  return String(value || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 60);
}

function bearerToken(value) {
  const match = String(value).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
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
    headers: { "Cache-Control": "no-store" },
  });
}
