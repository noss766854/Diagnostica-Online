(function () {
  const SETTINGS_KEY = "wrenchline.settings";
  const BOOT_CONFIG = window.WRENCHLINE_CONFIG || {};

  const els = {};
  const state = {
    settings: loadSettings(),
    supabase: null,
    user: null,
    profile: null,
    sessionToken: "",
    entitlements: null,
    billing: null,
    plans: [],
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  async function init() {
    cacheElements();
    bindEvents();
    renderShell();
    await connectSupabase();
    await refreshAccount();
    renderShell();
    renderBillingReturnNotice();
    createIcons();
  }

  function cacheElements() {
    [
      "premiumAccountBadge",
      "premiumAdminBtn",
      "premiumLogoutBtn",
      "premiumPlanStrip",
      "premiumPlanChoices",
      "premiumPortalBtn",
      "premiumCheckoutBtn",
      "premiumPageMessage",
      "premiumLoginPanel",
      "premiumLoginForm",
      "premiumEmailInput",
      "premiumPasswordInput",
      "premiumLoginBtn",
      "premiumLoginMessage",
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    els.premiumLoginForm.addEventListener("submit", handleLogin);
    els.premiumLogoutBtn.addEventListener("click", signOut);
    els.premiumPortalBtn.addEventListener("click", openBillingPortal);
    els.premiumCheckoutBtn.addEventListener("click", startCheckout);
    els.premiumPlanChoices.addEventListener("click", (event) => {
      const button = event.target.closest("[data-premium-plan-key]");
      if (button) startCheckout(button.dataset.premiumPlanKey);
    });
    els.premiumAdminBtn.addEventListener("click", () => {
      if (state.profile?.role === "admin") window.location.href = "/admin";
    });
  }

  async function connectSupabase() {
    if (!state.settings.supabaseUrl || !state.settings.supabaseAnonKey || !window.supabase) {
      setMessage("Supabase is not configured yet. Add the public URL and anon key in Vercel.", true);
      return;
    }
    state.supabase = window.supabase.createClient(state.settings.supabaseUrl, state.settings.supabaseAnonKey);
    state.supabase.auth.onAuthStateChange((_event, session) => {
      state.user = session?.user || null;
      state.sessionToken = session?.access_token || "";
      refreshAccount().then(renderShell).catch(() => renderShell());
    });
  }

  async function refreshAccount() {
    if (!state.supabase) return;
    const { data } = await state.supabase.auth.getSession();
    state.user = data?.session?.user || null;
    state.sessionToken = data?.session?.access_token || "";
    state.profile = state.user ? await loadProfile() : null;
    state.billing = null;
    state.entitlements = state.user ? await loadBillingStatus() : null;
  }

  async function loadProfile() {
    try {
      const { data, error } = await state.supabase
        .from("profiles")
        .select("id,email,role,display_name,is_disabled")
        .eq("id", state.user.id)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    } catch {
      return null;
    }
  }

  async function loadBillingStatus() {
    try {
      const response = await fetch("/api/billing/status", {
        headers: { Authorization: `Bearer ${state.sessionToken}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Billing status could not be loaded.");
      state.billing = data.billing || null;
      state.plans = Array.isArray(data.plans) ? data.plans : [];
      return data.entitlements || null;
    } catch (error) {
      setMessage(error.message || "Billing status could not be loaded.", true);
      return null;
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (!state.supabase) return;
    els.premiumLoginBtn.disabled = true;
    els.premiumLoginMessage.textContent = "Logging in...";
    try {
      const { data, error } = await state.supabase.auth.signInWithPassword({
        email: els.premiumEmailInput.value.trim(),
        password: els.premiumPasswordInput.value,
      });
      if (error) throw error;
      state.user = data?.user || null;
      await refreshAccount();
      els.premiumLoginMessage.textContent = "";
      renderShell();
    } catch (error) {
      els.premiumLoginMessage.textContent = error.message || "Login failed.";
    } finally {
      els.premiumLoginBtn.disabled = false;
    }
  }

  async function signOut() {
    if (state.supabase) await state.supabase.auth.signOut();
    state.user = null;
    state.profile = null;
    state.sessionToken = "";
    state.entitlements = null;
    state.billing = null;
    state.plans = [];
    renderShell();
  }

  async function startCheckout(planKey = "") {
    if (!state.user) {
      els.premiumEmailInput.focus();
      setMessage("Log in before starting Premium.", true);
      return;
    }
    setBusy(true);
    setMessage("Opening secure Stripe checkout...");
    try {
      const body = planKey ? JSON.stringify({ planKey }) : undefined;
      const data = await apiRequest("/api/billing/checkout", { method: "POST", body });
      if (!data.url) throw new Error("Stripe did not return a checkout URL.");
      window.location.href = data.url;
    } catch (error) {
      setMessage(error.message || "Premium checkout could not be started.", true);
      setBusy(false);
    }
  }

  async function openBillingPortal() {
    if (!state.user) {
      els.premiumEmailInput.focus();
      setMessage("Log in before managing billing.", true);
      return;
    }
    setBusy(true);
    setMessage("Opening Stripe billing portal...");
    try {
      const data = await apiRequest("/api/billing/portal", { method: "POST" });
      if (!data.url) throw new Error("Stripe did not return a billing portal URL.");
      window.location.href = data.url;
    } catch (error) {
      setMessage(error.message || "The billing portal could not be opened.", true);
      setBusy(false);
    }
  }

  async function apiRequest(url, options = {}) {
    if (!state.sessionToken) throw new Error("Login is required.");
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${state.sessionToken}`,
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "The billing request failed.");
    return data;
  }

  function renderShell() {
    const plan = state.entitlements?.plan || "free";
    const isPremium = plan === "premium";
    const isAdmin = plan === "admin" || state.profile?.role === "admin";
    const hasPortal = Boolean(state.billing?.hasCustomer || state.billing?.hasSubscription);
    const activePlans = Array.isArray(state.plans) ? state.plans : [];
    const priceConfigured = Boolean(state.billing?.priceConfigured || activePlans.length);
    els.premiumAccountBadge.textContent = state.user?.email || "Logged out";
    els.premiumLogoutBtn.hidden = !state.user;
    els.premiumLoginPanel.hidden = Boolean(state.user);
    els.premiumAdminBtn.hidden = !isAdmin;
    els.premiumPortalBtn.hidden = !state.user || !hasPortal;
    els.premiumCheckoutBtn.hidden = true;
    els.premiumPlanStrip.innerHTML = planStripHtml(plan, state.entitlements, priceConfigured);
    renderPlanChoices(activePlans, { isPremium, isAdmin });
    createIcons();
  }

  function renderBillingReturnNotice() {
    const params = new URLSearchParams(window.location.search);
    const billing = params.get("billing");
    if (billing === "success") {
      setMessage("Premium checkout completed. Stripe is confirming your subscription now.");
    } else if (billing === "cancelled") {
      setMessage("Premium checkout was cancelled. Your current plan has not changed.", true);
    } else {
      return;
    }
    params.delete("billing");
    const cleanQuery = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}${window.location.hash}`);
  }

  function planStripHtml(plan, entitlements, priceConfigured) {
    if (!state.user) {
      return `<span class="plan-badge free">Free</span><span>Log in to manage your Premium subscription.</span>`;
    }
    if (plan === "admin") {
      return `<span class="plan-badge admin">Admin</span><span>Unlimited diagnostic access. No subscription is needed.</span>`;
    }
    if (plan === "premium") {
      return `<span class="plan-badge premium">Premium</span><span>Premium is active. Ads are disabled for this account.</span>`;
    }
    const used = Number(entitlements?.aiMessagesUsedToday || 0);
    const limit = Number(entitlements?.aiMessagesDailyLimit || 10);
    const action = priceConfigured ? "Start Premium when you want higher limits and no ads." : "Premium checkout is not configured yet.";
    return `<span class="plan-badge free">Free</span><span>${used}/${limit} diagnostic messages used today. ${action}</span>`;
  }

  function renderPlanChoices(plans, account) {
    const canBuy = Boolean(state.user) && !account.isPremium && !account.isAdmin && plans.length > 0;
    els.premiumPlanChoices.hidden = !canBuy;
    if (!canBuy) {
      els.premiumPlanChoices.innerHTML = "";
      return;
    }
    els.premiumPlanChoices.innerHTML = plans
      .map((plan) => {
        const featured = plan.featured ? "Featured plan" : "Premium plan";
        return `
          <button class="premium-plan-card" type="button" data-premium-plan-key="${escapeHtml(plan.key || "")}">
            <span>
              <strong>${escapeHtml(plan.label || "Premium")}</strong>
              <span>${escapeHtml(plan.description || "Higher limits and no ads.")}</span>
              <small>${escapeHtml(featured)}</small>
            </span>
            <span class="premium-plan-price">${escapeHtml(plan.displayPrice || "Premium")}</span>
          </button>
        `;
      })
      .join("");
  }

  function setBusy(busy) {
    els.premiumCheckoutBtn.disabled = busy;
    els.premiumPortalBtn.disabled = busy;
    els.premiumPlanChoices.querySelectorAll("button").forEach((button) => {
      button.disabled = busy;
    });
  }

  function setMessage(message, alert = false) {
    els.premiumPageMessage.textContent = message || "";
    els.premiumPageMessage.classList.toggle("error", Boolean(alert));
  }

  function loadSettings() {
    try {
      return { ...BOOT_CONFIG, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") || {}) };
    } catch {
      return { ...BOOT_CONFIG };
    }
  }

  function createIcons() {
    if (window.lucide?.createIcons) window.lucide.createIcons();
  }
})();
