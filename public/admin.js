(function () {
  const SETTINGS_KEY = "wrenchline.settings";
  const BOOT_CONFIG = window.WRENCHLINE_CONFIG || {};
  const DEFAULT_SETTINGS = {
    supabaseUrl: "",
    supabaseAnonKey: "",
    adminUsername: "MechanicAdmin",
    adminEmail: "admin@diagnostica-online.com",
    ...BOOT_CONFIG,
  };

  const DEFAULT_SITE_CONTENT = {
    assistantName: "Gemini Diagnostic AI",
    assistantAvatarText: "AI",
    welcomeMessage:
      "Hi, I'm the Gemini diagnostic intake assistant. Tell me the year, make, model, mileage, symptoms, warning lights, sounds, smells, and when the issue happens.",
    typingMessage: "Gemini is reviewing your symptoms...",
    systemPrompt:
      "You are Gemini Diagnostic AI for WrenchLine Auto Helpdesk. You are the intake LLM before a live technician handoff. Ask one concise diagnostic question at a time. When enough details are collected, summarize the case and say it is ready for a technician handoff.",
    handoffAfterMessages: 3,
    handoffMessage:
      "I've organized the symptoms into a technician-ready case. {technicianName} can take over from here on a voice or video call with this brief already in hand.",
    technicianName: "Elena M.",
    technicianTitle: "Diagnostic Technician",
    technicianStats: "4,218 satisfied drivers",
    technicianExperience: "22 years diagnosing drivability, brake, and electrical issues",
    technicianAvatar:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=160&q=80",
  };

  const els = {};
  const state = {
    settings: loadSettings(),
    siteContent: { ...DEFAULT_SITE_CONTENT },
    supabase: null,
    user: null,
    profile: null,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  async function init() {
    cacheElements();
    bindEvents();
    fillConnectionFields();
    await connectSupabase();
    await refreshUser();
    if (state.user) {
      await verifyAdminAndLoad();
    }
    createIcons();
  }

  function cacheElements() {
    [
      "adminAccountBadge",
      "adminLogoutBtn",
      "adminLoginCard",
      "adminDashboard",
      "adminLoginForm",
      "adminSupabaseUrlInput",
      "adminSupabaseAnonInput",
      "adminUsernameInput",
      "adminPasswordInput",
      "adminMessage",
      "adminLoginBtn",
      "saveConnectionBtn",
      "refreshAdminBtn",
      "adminStats",
      "adminConversations",
      "adminBookings",
      "siteContentForm",
      "assistantNameInput",
      "assistantAvatarTextInput",
      "welcomeMessageInput",
      "systemPromptInput",
      "handoffAfterMessagesInput",
      "handoffMessageInput",
      "technicianNameInput",
      "technicianTitleInput",
      "technicianStatsInput",
      "technicianExperienceInput",
      "technicianAvatarInput",
      "siteContentMessage",
      "saveSiteContentBtn",
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    els.adminLoginForm.addEventListener("submit", login);
    els.saveConnectionBtn.addEventListener("click", saveConnectionOnly);
    els.adminLogoutBtn.addEventListener("click", logout);
    els.refreshAdminBtn.addEventListener("click", verifyAdminAndLoad);
    els.siteContentForm.addEventListener("submit", saveSiteContent);
  }

  async function connectSupabase() {
    if (!state.settings.supabaseUrl || !state.settings.supabaseAnonKey || !window.supabase) {
      renderLoggedOut("Add Supabase connection details and log in.");
      return;
    }
    state.supabase = window.supabase.createClient(state.settings.supabaseUrl, state.settings.supabaseAnonKey);
  }

  async function refreshUser() {
    if (!state.supabase) return;
    const { data } = await state.supabase.auth.getSession();
    state.user = data?.session?.user || null;
    renderAccount();
  }

  async function login(event) {
    event.preventDefault();
    saveConnectionSettings();
    await connectSupabase();

    if (!state.supabase) {
      renderLoggedOut("Supabase is not configured.");
      return;
    }

    els.adminLoginBtn.disabled = true;
    els.adminMessage.textContent = "Logging in...";
    try {
      const { error } = await state.supabase.auth.signInWithPassword({
        email: resolveAdminEmail(els.adminUsernameInput.value.trim()),
        password: els.adminPasswordInput.value,
      });
      if (error) throw error;
      await refreshUser();
      await verifyAdminAndLoad();
    } catch (error) {
      renderLoggedOut(authErrorMessage(error));
    } finally {
      els.adminLoginBtn.disabled = false;
    }
  }

  function authErrorMessage(error) {
    const message = error?.message || "Admin login failed.";
    if (/invalid login credentials/i.test(message)) {
      return `Invalid login. Create the Supabase Auth user ${state.settings.adminEmail}, set its password, then log in with username ${state.settings.adminUsername}.`;
    }
    return message;
  }

  async function saveConnectionOnly() {
    saveConnectionSettings();
    await connectSupabase();
    els.adminMessage.textContent =
      "Supabase connection saved in this browser. Create the admin Auth user, then enter its password to open the dashboard.";
    renderAccount();
  }

  function saveConnectionSettings() {
    state.settings.supabaseUrl = els.adminSupabaseUrlInput.value.trim();
    state.settings.supabaseAnonKey = els.adminSupabaseAnonInput.value.trim();
    state.settings.adminUsername = DEFAULT_SETTINGS.adminUsername;
    state.settings.adminEmail = DEFAULT_SETTINGS.adminEmail;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...loadSettings(), ...state.settings }));
  }

  async function verifyAdminAndLoad() {
    if (!state.supabase || !state.user) {
      renderLoggedOut("Log in with an admin account.");
      return;
    }

    els.adminMessage.textContent = "";
    const { data, error } = await state.supabase.from("profiles").select("id,email,role,display_name").eq("id", state.user.id).limit(1);
    if (error) {
      renderLoggedOut(error.message);
      return;
    }

    state.profile = data?.[0] || null;
    if (state.profile?.role !== "admin") {
      renderLoggedOut("This Supabase user is not marked as an admin.");
      return;
    }

    els.adminLoginCard.hidden = true;
    els.adminDashboard.hidden = false;
    renderAccount();
    await loadSiteContent();
    await loadDashboard();
  }

  function resolveAdminEmail(username) {
    if (username.includes("@")) return username;
    if (username !== state.settings.adminUsername) {
      throw new Error(`Use the configured admin username: ${state.settings.adminUsername}`);
    }
    return state.settings.adminEmail;
  }

  async function loadDashboard() {
    const [conversationCount, bookingCount, userCount, conversations, bookings] = await Promise.all([
      countRows("conversations"),
      countRows("call_bookings"),
      countRows("profiles"),
      state.supabase.from("conversations").select("id,title,owner_id,vehicle,updated_at").order("updated_at", { ascending: false }).limit(12),
      state.supabase.from("call_bookings").select("id,owner_id,call_type,duration_minutes,total_usd,status,created_at").order("created_at", { ascending: false }).limit(12),
    ]);

    els.adminStats.innerHTML = [
      ["Conversations", conversationCount],
      ["Call bookings", bookingCount],
      ["Users", userCount],
    ]
      .map((stat) => `<div class="stat-card"><span>${escapeHtml(stat[0])}</span><strong>${escapeHtml(stat[1])}</strong></div>`)
      .join("");

    renderConversationTable(conversations.data || []);
    renderBookingTable(bookings.data || []);
  }

  async function loadSiteContent() {
    state.siteContent = { ...DEFAULT_SITE_CONTENT };
    try {
      const { data, error } = await state.supabase.from("site_settings").select("value").eq("key", "public_content").maybeSingle();
      if (error) throw error;
      if (data?.value && typeof data.value === "object") {
        state.siteContent = sanitizeSiteContent(data.value);
      }
    } catch (error) {
      els.siteContentMessage.textContent = "Using default content until site_settings is available.";
    }
    fillSiteContentForm();
  }

  async function saveSiteContent(event) {
    event.preventDefault();
    if (!state.supabase || state.profile?.role !== "admin") {
      els.siteContentMessage.textContent = "Admin access is required.";
      return;
    }

    const content = sanitizeSiteContent({
      assistantName: els.assistantNameInput.value,
      assistantAvatarText: els.assistantAvatarTextInput.value,
      welcomeMessage: els.welcomeMessageInput.value,
      typingMessage: DEFAULT_SITE_CONTENT.typingMessage,
      systemPrompt: els.systemPromptInput.value,
      handoffAfterMessages: els.handoffAfterMessagesInput.value,
      handoffMessage: els.handoffMessageInput.value,
      technicianName: els.technicianNameInput.value,
      technicianTitle: els.technicianTitleInput.value,
      technicianStats: els.technicianStatsInput.value,
      technicianExperience: els.technicianExperienceInput.value,
      technicianAvatar: els.technicianAvatarInput.value,
    });

    els.saveSiteContentBtn.disabled = true;
    els.siteContentMessage.textContent = "Saving...";
    try {
      const { error } = await state.supabase.from("site_settings").upsert({
        key: "public_content",
        value: content,
        updated_by: state.user.id,
      });
      if (error) throw error;
      state.siteContent = content;
      els.siteContentMessage.textContent = "Saved. The public site will use these Gemini and technician settings.";
    } catch (error) {
      els.siteContentMessage.textContent = error.message || "Could not save settings.";
    } finally {
      els.saveSiteContentBtn.disabled = false;
    }
  }

  function fillSiteContentForm() {
    const content = state.siteContent;
    els.assistantNameInput.value = content.assistantName;
    els.assistantAvatarTextInput.value = content.assistantAvatarText;
    els.welcomeMessageInput.value = content.welcomeMessage;
    els.systemPromptInput.value = content.systemPrompt;
    els.handoffAfterMessagesInput.value = content.handoffAfterMessages;
    els.handoffMessageInput.value = content.handoffMessage;
    els.technicianNameInput.value = content.technicianName;
    els.technicianTitleInput.value = content.technicianTitle;
    els.technicianStatsInput.value = content.technicianStats;
    els.technicianExperienceInput.value = content.technicianExperience;
    els.technicianAvatarInput.value = content.technicianAvatar;
  }

  function sanitizeSiteContent(value) {
    const merged = { ...DEFAULT_SITE_CONTENT, ...(value || {}) };
    return {
      assistantName: cleanText(merged.assistantName, DEFAULT_SITE_CONTENT.assistantName),
      assistantAvatarText: cleanText(merged.assistantAvatarText, DEFAULT_SITE_CONTENT.assistantAvatarText).slice(0, 3),
      welcomeMessage: cleanText(merged.welcomeMessage, DEFAULT_SITE_CONTENT.welcomeMessage),
      typingMessage: cleanText(merged.typingMessage, DEFAULT_SITE_CONTENT.typingMessage),
      systemPrompt: cleanText(merged.systemPrompt, DEFAULT_SITE_CONTENT.systemPrompt),
      handoffAfterMessages: Math.max(1, Math.min(12, Number(merged.handoffAfterMessages) || DEFAULT_SITE_CONTENT.handoffAfterMessages)),
      handoffMessage: cleanText(merged.handoffMessage, DEFAULT_SITE_CONTENT.handoffMessage),
      technicianName: cleanText(merged.technicianName, DEFAULT_SITE_CONTENT.technicianName),
      technicianTitle: cleanText(merged.technicianTitle, DEFAULT_SITE_CONTENT.technicianTitle),
      technicianStats: cleanText(merged.technicianStats, DEFAULT_SITE_CONTENT.technicianStats),
      technicianExperience: cleanText(merged.technicianExperience, DEFAULT_SITE_CONTENT.technicianExperience),
      technicianAvatar: cleanUrl(merged.technicianAvatar, DEFAULT_SITE_CONTENT.technicianAvatar),
    };
  }

  function cleanText(value, fallback) {
    const text = String(value || "").trim();
    return text || fallback;
  }

  function cleanUrl(value, fallback) {
    const text = String(value || "").trim();
    try {
      const url = new URL(text);
      return url.protocol === "https:" ? text : fallback;
    } catch (error) {
      return fallback;
    }
  }

  async function countRows(table) {
    const { count } = await state.supabase.from(table).select("*", { count: "exact", head: true });
    return count || 0;
  }

  function renderConversationTable(rows) {
    if (!rows.length) {
      els.adminConversations.innerHTML = `<div class="empty-state">No conversations yet.</div>`;
      return;
    }
    els.adminConversations.innerHTML = rows
      .map((row) => {
        const vehicle = row.vehicle || {};
        const vehicleText = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Unknown vehicle";
        return `
          <div class="admin-row">
            <strong>${escapeHtml(row.title || "Mechanic case")}</strong>
            <span>${escapeHtml(vehicleText)}</span>
            <span>${formatDate(row.updated_at)}</span>
          </div>
        `;
      })
      .join("");
  }

  function renderBookingTable(rows) {
    if (!rows.length) {
      els.adminBookings.innerHTML = `<div class="empty-state">No bookings yet.</div>`;
      return;
    }
    els.adminBookings.innerHTML = rows
      .map(
        (row) => `
          <div class="admin-row">
            <strong>${escapeHtml(capitalize(row.call_type || "call"))} call</strong>
            <span>${escapeHtml(row.duration_minutes || 0)} min - $${escapeHtml(row.total_usd || 0)}</span>
            <span>${escapeHtml(row.status || "pending")} - ${formatDate(row.created_at)}</span>
          </div>
        `
      )
      .join("");
  }

  async function logout() {
    if (state.supabase) await state.supabase.auth.signOut();
    state.user = null;
    state.profile = null;
    renderLoggedOut("Signed out.");
  }

  function renderLoggedOut(message) {
    els.adminLoginCard.hidden = false;
    els.adminDashboard.hidden = true;
    els.adminMessage.textContent = message || "";
    renderAccount();
  }

  function renderAccount() {
    if (state.user) {
      els.adminAccountBadge.textContent = state.user.email || "Logged in";
      els.adminLogoutBtn.hidden = false;
    } else {
      els.adminAccountBadge.textContent = "Logged out";
      els.adminLogoutBtn.hidden = true;
    }
  }

  function fillConnectionFields() {
    els.adminSupabaseUrlInput.value = state.settings.supabaseUrl || "";
    els.adminSupabaseAnonInput.value = state.settings.supabaseAnonKey || "";
    els.adminUsernameInput.value = state.settings.adminUsername || DEFAULT_SETTINGS.adminUsername;
  }

  function loadSettings() {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") };
    } catch (error) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function formatDate(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function capitalize(value) {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function createIcons() {
    if (window.lucide) window.lucide.createIcons();
  }
})();
