(function () {
  const BOOT_CONFIG = window.WRENCHLINE_CONFIG || {};
  const DEFAULT_CONTENT = {
    supportEmail: "support@diagnostica-online.com",
    serviceArea: "Remote mechanic consulting",
    termsText:
      "DiagnosticaOnline provides AI-assisted automotive diagnostics, saved cases, file storage, free text chat when available, and optional paid voice or video consulting. Guidance is informational, may be incomplete, and does not replace an in-person inspection, factory service information, recall check, repair estimate, or safety inspection. You must have lawful authority to diagnose or modify the vehicle and remain responsible for safe tools, lifting, isolation, protective equipment, and deciding whether the vehicle can be operated.",
    privacyText:
      "We collect account details; vehicle information such as VIN or ECU identifiers when supplied; symptoms, DTCs, messages, uploads, AI usage and token estimates; booking/payment identifiers; consent choices; and technical security logs. We use this data to provide and secure the service, enforce plan limits, send account or booking emails, process payments, show ads on free plans after consent, and improve diagnostics. Data may be processed by Supabase, the configured AI provider, Resend, Stripe, Jitsi, and Google AdSense. Google may use cookies, local storage, IP addresses, device information, and ad interactions to provide, measure, and personalize ads according to your consent choices and Google policies. Contact the listed support address for access or deletion requests, subject to legal and fraud-prevention retention duties.",
    cookieText:
      "We use essential browser storage for login state, saved drafts, consent choices, and site preferences. Advertising is disabled for premium and admin plans. On free plans, Google AdSense ad units load only after ad consent is accepted. Choosing Essential only keeps ad storage and personalized ad loading disabled. If you serve ads to users in the EEA, UK, or Switzerland, configure a Google-certified consent management platform in your AdSense privacy settings before relying on personalized ads.",
    refundText:
      "Free text chat is not charged. Paid voice or video calls are charged based on the selected duration and rate shown at checkout. Add your final refund, cancellation, no-show, and rescheduling rules in admin before accepting production payments.",
    disclaimerText:
      "AI intake and remote consulting are not emergency services and cannot guarantee a diagnosis or repair. Vehicle work can involve fire, fuel, toxic chemicals, high voltage, moving components, stored pressure, air bags, and crushing hazards. Stop driving and seek qualified local help for smoke, fire risk, fuel leaks, brake or steering loss, severe overheating, oil-pressure warnings, or other immediate danger. ECU, immobilizer, and emissions laws vary by location. DiagnosticaOnline refuses emissions defeat, immobilizer bypass without lawful ownership procedures, odometer fraud, theft enablement, and unsafe bypass instructions, while allowing lawful diagnostics, repair, and restoration of original or factory software.",
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
