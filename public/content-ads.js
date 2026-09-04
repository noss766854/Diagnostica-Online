(function () {
  const STORAGE = {
    settings: "wrenchline.settings",
    consent: "wrenchline.consent",
  };
  const DEFAULT_ADSENSE_CLIENT = "ca-pub-6817388263556075";
  const DEFAULT_CONSENT = {
    adsClient: DEFAULT_ADSENSE_CLIENT,
    adsSlot: "",
    adSlots: {},
    consentEnabled: true,
    consentTitle: "Cookie and ad consent",
    consentBody: "We use essential storage for site preferences. With your consent, we also use ads on free content pages.",
    consentAcceptText: "Accept ads",
    consentRejectText: "Essential only",
  };

  const state = {
    config: { ...DEFAULT_CONSENT, ...loadBootConfig(), ...loadLocalSettings() },
    entitlements: null,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  async function init() {
    updateGoogleConsent(loadConsent());
    if (!hasPublisherContent()) {
      clearAllAds();
      return;
    }
    await loadPublicContent();
    await loadEntitlements();
    bindConsentBanner();
    renderConsent();
    renderAds();
    window.addEventListener("resize", debounce(renderAds, 250));
  }

  async function loadPublicContent() {
    try {
      const response = await fetch("/api/public/site-content", { headers: { Accept: "application/json" } });
      const data = await response.json();
      if (response.ok && data && typeof data === "object") {
        state.config = { ...state.config, ...data };
      }
    } catch {
      // The page still works with the boot/env configuration.
    }
  }

  async function loadEntitlements() {
    if (!window.supabase || !state.config.supabaseUrl || !state.config.supabaseAnonKey) return;
    try {
      const client = window.supabase.createClient(state.config.supabaseUrl, state.config.supabaseAnonKey);
      const { data } = await client.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) return;
      const response = await fetch("/api/account/entitlements", {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) state.entitlements = payload.entitlements || null;
    } catch {
      state.entitlements = null;
    }
  }

  function bindConsentBanner() {
    const banner = document.querySelector("[data-content-consent]");
    if (!banner || banner.dataset.bound === "true") return;
    banner.dataset.bound = "true";
    banner.querySelector("[data-consent-accept]")?.addEventListener("click", () => saveConsent("ads"));
    banner.querySelector("[data-consent-reject]")?.addEventListener("click", () => saveConsent("essential"));
  }

  function renderConsent() {
    const banner = document.querySelector("[data-content-consent]");
    if (!banner) return;
    const planShowsAds = !state.entitlements || state.entitlements.showAds !== false;
    banner.hidden = !state.config.consentEnabled || !planShowsAds || Boolean(loadConsent());
    const title = banner.querySelector("[data-consent-title]");
    const body = banner.querySelector("[data-consent-body]");
    const accept = banner.querySelector("[data-consent-accept]");
    const reject = banner.querySelector("[data-consent-reject]");
    if (title) title.textContent = state.config.consentTitle || DEFAULT_CONSENT.consentTitle;
    if (body) body.textContent = state.config.consentBody || DEFAULT_CONSENT.consentBody;
    if (accept) accept.textContent = state.config.consentAcceptText || DEFAULT_CONSENT.consentAcceptText;
    if (reject) reject.textContent = state.config.consentRejectText || DEFAULT_CONSENT.consentRejectText;
  }

  function saveConsent(value) {
    localStorage.setItem(STORAGE.consent, value);
    updateGoogleConsent(value);
    renderConsent();
    renderAds();
  }

  function loadConsent() {
    try {
      return localStorage.getItem(STORAGE.consent) || "";
    } catch {
      return "";
    }
  }

  function canRenderAds() {
    const planShowsAds = !state.entitlements || state.entitlements.showAds !== false;
    return planShowsAds && hasPublisherContent() && (!state.config.consentEnabled || loadConsent() === "ads");
  }

  function renderAds() {
    const mounts = Array.from(document.querySelectorAll(".ad-mount[data-ad-surface='publisher']"));
    const allowed = canRenderAds();
    mounts.forEach((mount) => {
      mount.hidden = !allowed;
      if (!allowed) clearAdMount(mount);
    });
    if (!allowed || !state.config.adsClient || !hasAnyAdSlot()) return;
    ensureAdScript();
    mounts.forEach((mount) => {
      if (!isVisible(mount)) {
        clearAdMount(mount);
        return;
      }
      const slot = adSlotForMount(mount);
      if (!slot) {
        clearAdMount(mount);
        return;
      }
      if (mount.dataset.renderedClient === state.config.adsClient && mount.dataset.renderedSlot === slot) return;
      mount.innerHTML = "";
      const ad = document.createElement("ins");
      ad.className = "adsbygoogle";
      ad.style.display = "block";
      ad.style.minHeight = mount.classList.contains("side-ad") ? "250px" : mount.classList.contains("banner-ad") ? "90px" : "100px";
      ad.setAttribute("aria-label", "Advertisement");
      ad.dataset.adClient = state.config.adsClient;
      ad.dataset.adSlot = slot;
      ad.dataset.adFormat = "auto";
      ad.dataset.fullWidthResponsive = "true";
      mount.appendChild(ad);
      mount.dataset.renderedClient = state.config.adsClient;
      mount.dataset.renderedSlot = slot;
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch {
        clearAdMount(mount);
      }
    });
  }

  function clearAllAds() {
    document.querySelectorAll(".ad-mount").forEach((mount) => {
      mount.hidden = true;
      clearAdMount(mount);
    });
  }

  function clearAdMount(mount) {
    delete mount.dataset.renderedClient;
    delete mount.dataset.renderedSlot;
    mount.innerHTML = "<span>Advertisement</span>";
  }

  function ensureAdScript() {
    const scriptId = "adsbygoogle-script";
    const existing = document.getElementById(scriptId);
    if (existing && existing.dataset.adsClient === state.config.adsClient) return;
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.adsClient = state.config.adsClient;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(state.config.adsClient)}`;
    document.head.appendChild(script);
  }

  function hasAnyAdSlot() {
    return Boolean(state.config.adsSlot || Object.values(state.config.adSlots || {}).some(Boolean));
  }

  function adSlotForMount(mount) {
    const key = adSlotKey(mount.dataset.adSlot || "");
    return (state.config.adSlots && state.config.adSlots[key]) || state.config.adsSlot || "";
  }

  function adSlotKey(value) {
    return String(value || "").replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
  }

  function isVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
  }

  function hasPublisherContent() {
    return Boolean(document.querySelector("[data-publisher-content='true']"));
  }

  function updateGoogleConsent(value) {
    const granted = value === "ads";
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function gtag() {
        window.dataLayer.push(arguments);
      };
    window.gtag("consent", "update", {
      ad_storage: granted ? "granted" : "denied",
      ad_user_data: granted ? "granted" : "denied",
      ad_personalization: granted ? "granted" : "denied",
      analytics_storage: "denied",
    });
  }

  function loadBootConfig() {
    return window.WRENCHLINE_CONFIG || {};
  }

  function loadLocalSettings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.settings) || "{}") || {};
    } catch {
      return {};
    }
  }

  function debounce(fn, wait) {
    let timer = 0;
    return function debounced() {
      window.clearTimeout(timer);
      timer = window.setTimeout(fn, wait);
    };
  }
})();
