(function () {
  const BOOT_CONFIG = window.WRENCHLINE_CONFIG || {};
  const DEFAULT_CONTENT = {
    supportEmail: "support@diagnostica-online.com",
    businessAddress: "Add your business address in admin.",
    serviceArea: "Remote mechanic consulting",
    termsText:
      "DiagnosticaOnline provides remote automotive information, AI intake, saved case notes, free text chat when available, and paid voice or video consulting. Remote advice is informational and does not replace an in-person inspection, repair estimate, recall check, or safety inspection. Users are responsible for deciding whether a vehicle is safe to operate.",
    privacyText:
      "We collect account information, saved conversations, vehicle details you provide, booking records, and technical data needed to run the service. We use this data to provide mechanic consulting, save cases, send account and booking emails, improve the service, and protect against abuse. Configure your final privacy policy with your legal entity, address, analytics, ad partners, and data retention requirements before launch.",
    cookieText:
      "We use local storage for login state, saved draft conversations, consent choices, and site preferences. Advertising partners such as Google AdSense may use cookies or similar technologies when ads are enabled and allowed by consent settings.",
    refundText:
      "Free text chat is not charged. Paid voice or video calls are charged based on the selected duration and rate shown at checkout. Add your final refund, cancellation, no-show, and rescheduling rules in admin before accepting production payments.",
    disclaimerText:
      "AI intake and remote mechanic consulting are not emergency services and cannot guarantee diagnosis or repair. If there is smoke, fire risk, fuel smell, brake loss, steering loss, severe overheating, or any immediate safety concern, stop driving and seek local professional or emergency assistance.",
  };

  const els = {};

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  async function init() {
    [
      "legalContactLink",
      "legalUpdatedCopy",
      "legalSupportEmail",
      "legalBusinessAddress",
      "legalServiceArea",
      "legalTermsText",
      "legalPrivacyText",
      "legalCookieText",
      "legalRefundText",
      "legalDisclaimerText",
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
    render(DEFAULT_CONTENT);
    const content = await loadSiteContent();
    render(content);
  }

  async function loadSiteContent() {
    if (!BOOT_CONFIG.supabaseUrl || !BOOT_CONFIG.supabaseAnonKey || !window.supabase) return DEFAULT_CONTENT;
    try {
      const client = window.supabase.createClient(BOOT_CONFIG.supabaseUrl, BOOT_CONFIG.supabaseAnonKey);
      const { data, error } = await client.from("site_settings").select("value").eq("key", "public_content").maybeSingle();
      if (error) throw error;
      return sanitize(data?.value);
    } catch (error) {
      return DEFAULT_CONTENT;
    }
  }

  function render(content) {
    els.legalContactLink.href = `mailto:${content.supportEmail}`;
    els.legalSupportEmail.textContent = content.supportEmail;
    els.legalBusinessAddress.textContent = content.businessAddress;
    els.legalServiceArea.textContent = content.serviceArea;
    els.legalTermsText.textContent = content.termsText;
    els.legalPrivacyText.textContent = content.privacyText;
    els.legalCookieText.textContent = content.cookieText;
    els.legalRefundText.textContent = content.refundText;
    els.legalDisclaimerText.textContent = content.disclaimerText;
    els.legalUpdatedCopy.textContent = "These policies should be reviewed before launch and updated whenever the service changes.";
  }

  function sanitize(value) {
    const merged = { ...DEFAULT_CONTENT, ...(value && typeof value === "object" ? value : {}) };
    return {
      supportEmail: cleanEmail(merged.supportEmail, DEFAULT_CONTENT.supportEmail),
      businessAddress: cleanText(merged.businessAddress, DEFAULT_CONTENT.businessAddress),
      serviceArea: cleanText(merged.serviceArea, DEFAULT_CONTENT.serviceArea),
      termsText: cleanText(merged.termsText, DEFAULT_CONTENT.termsText),
      privacyText: cleanText(merged.privacyText, DEFAULT_CONTENT.privacyText),
      cookieText: cleanText(merged.cookieText, DEFAULT_CONTENT.cookieText),
      refundText: cleanText(merged.refundText, DEFAULT_CONTENT.refundText),
      disclaimerText: cleanText(merged.disclaimerText, DEFAULT_CONTENT.disclaimerText),
    };
  }

  function cleanText(value, fallback) {
    const text = String(value || "").trim();
    return text || fallback;
  }

  function cleanEmail(value, fallback) {
    const text = String(value || "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? text : fallback;
  }
})();
