(function () {
  const SETTINGS_KEY = "wrenchline.settings";
  const BOOT_CONFIG = window.WRENCHLINE_CONFIG || {};
  const DEFAULT_SETTINGS = {
    supabaseUrl: "",
    supabaseAnonKey: "",
    geminiEndpoint: "/api/gemini",
    geminiModel: "gemini-2.5-flash",
    adsClient: "",
    adsSlot: "",
    checkoutUrl: "",
    jitsiDomain: "meet.jit.si",
    ...BOOT_CONFIG,
  };

  const DEFAULT_SITE_CONTENT = {
    assistantName: "Gemini Diagnostic AI",
    assistantAvatarText: "AI",
    welcomeMessage:
      "Hi, I'm the Gemini diagnostic intake assistant. Tell me the year, make, model, mileage, symptoms, warning lights, sounds, smells, and when the issue happens.",
    typingMessage: "Gemini is reviewing your symptoms...",
    systemPrompt:
      "You are Gemini Diagnostic AI for WrenchLine Auto Helpdesk. You are the intake LLM before a live technician handoff. Ask one concise diagnostic question at a time. When enough details are collected, tell the customer a live technician can continue by voice or video. Never show the customer a mechanic-facing case summary, internal brief, bullet-point diagnostic summary, or the heading Case Summary.",
    handoffAfterMessages: 3,
    handoffMessage:
      "I have enough detail for {technicianName} to continue. You can reserve a voice or video call whenever you're ready.",
    technicianName: "Elena M.",
    technicianTitle: "Diagnostic Technician",
    technicianStats: "4,218 satisfied drivers",
    technicianExperience: "22 years diagnosing drivability, brake, and electrical issues",
    technicianAvatar:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=160&q=80",
    emailFromName: "Diagnostica Online",
    emailFromAddress: "verify@diagnostica-online.com",
    emailSubject: "Verify your Diagnostica Online account",
    emailIntro: "Confirm your email so your mechanic conversations stay saved to your account.",
    geminiEndpoint: DEFAULT_SETTINGS.geminiEndpoint,
    geminiModel: DEFAULT_SETTINGS.geminiModel,
    adsClient: DEFAULT_SETTINGS.adsClient,
    adsSlot: DEFAULT_SETTINGS.adsSlot,
    checkoutUrl: DEFAULT_SETTINGS.checkoutUrl,
    jitsiDomain: DEFAULT_SETTINGS.jitsiDomain,
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
    await connectSupabase();
    await refreshUser();
    if (state.user) {
      await verifyAdminAndLoad();
    } else {
      renderLoggedOut("Log in from the main site with username MechanicAdmin, then open the admin dashboard.");
    }
    createIcons();
  }

  function cacheElements() {
    [
      "adminAccountBadge",
      "adminLogoutBtn",
      "adminLoginCard",
      "adminDashboard",
      "adminMessage",
      "adminLoginRedirectBtn",
      "refreshAdminBtn",
      "adminStats",
      "configStatus",
      "adminReadyCases",
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
      "emailFromNameInput",
      "emailFromAddressInput",
      "emailSubjectInput",
      "emailIntroInput",
      "geminiEndpointInput",
      "geminiModelInput",
      "adsClientInput",
      "adsSlotInput",
      "checkoutUrlInput",
      "jitsiDomainInput",
      "siteContentMessage",
      "saveSiteContentBtn",
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
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
    await loadConfigStatus();
    await loadDashboard();
  }

  async function loadConfigStatus() {
    if (!els.configStatus) return;
    els.configStatus.innerHTML = `<div class="empty-state">Checking production configuration...</div>`;
    try {
      const headers = {};
      const { data } = await state.supabase.auth.getSession();
      if (data?.session?.access_token) {
        headers.Authorization = `Bearer ${data.session.access_token}`;
      }
      const response = await fetch("/api/admin/config/status", { headers });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Configuration status is unavailable.");
      renderConfigStatus(payload.items || []);
    } catch (error) {
      els.configStatus.innerHTML = `<div class="empty-state">${escapeHtml(error.message || "Configuration status is unavailable.")}</div>`;
    }
  }

  function renderConfigStatus(items) {
    if (!items.length) {
      els.configStatus.innerHTML = `<div class="empty-state">No production configuration status available.</div>`;
      return;
    }

    els.configStatus.innerHTML = items
      .map(
        (item) => `
          <div class="config-status-card ${item.configured ? "configured" : "missing"}">
            <span>${escapeHtml(item.label)}</span>
            <strong>${item.configured ? "Configured" : "Missing"}</strong>
            <small>${escapeHtml(item.secret ? "Secret" : "Public")} - ${escapeHtml(item.location || "Vercel")}</small>
          </div>
        `
      )
      .join("");
  }

  async function loadDashboard() {
    const [conversationCount, bookingCount, userCount, conversations, bookings] = await Promise.all([
      countRows("conversations"),
      countRows("call_bookings"),
      countRows("profiles"),
      state.supabase
        .from("conversations")
        .select("id,title,owner_id,vehicle,messages,brief,created_at,updated_at")
        .order("updated_at", { ascending: false })
        .limit(50),
      state.supabase.from("call_bookings").select("id,owner_id,call_type,duration_minutes,total_usd,status,created_at").order("created_at", { ascending: false }).limit(12),
    ]);
    const conversationRows = conversations.data || [];
    const readyRows = conversationRows.filter(isReadyCase);

    els.adminStats.innerHTML = [
      ["Conversations", conversationCount],
      ["Ready cases", readyRows.length],
      ["Call bookings", bookingCount],
      ["Users", userCount],
    ]
      .map((stat) => `<div class="stat-card"><span>${escapeHtml(stat[0])}</span><strong>${escapeHtml(stat[1])}</strong></div>`)
      .join("");

    renderReadyCaseTable(readyRows);
    renderConversationTable(conversationRows);
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
      emailFromName: els.emailFromNameInput.value,
      emailFromAddress: els.emailFromAddressInput.value,
      emailSubject: els.emailSubjectInput.value,
      emailIntro: els.emailIntroInput.value,
      geminiEndpoint: els.geminiEndpointInput.value,
      geminiModel: els.geminiModelInput.value,
      adsClient: els.adsClientInput.value,
      adsSlot: els.adsSlotInput.value,
      checkoutUrl: els.checkoutUrlInput.value,
      jitsiDomain: els.jitsiDomainInput.value,
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
      els.siteContentMessage.textContent = "Saved. The public site will use these AI, ad, call, technician, and verification email settings.";
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
    els.emailFromNameInput.value = content.emailFromName;
    els.emailFromAddressInput.value = content.emailFromAddress;
    els.emailSubjectInput.value = content.emailSubject;
    els.emailIntroInput.value = content.emailIntro;
    els.geminiEndpointInput.value = content.geminiEndpoint;
    els.geminiModelInput.value = content.geminiModel;
    els.adsClientInput.value = content.adsClient;
    els.adsSlotInput.value = content.adsSlot;
    els.checkoutUrlInput.value = content.checkoutUrl;
    els.jitsiDomainInput.value = content.jitsiDomain;
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
      emailFromName: cleanText(merged.emailFromName, DEFAULT_SITE_CONTENT.emailFromName),
      emailFromAddress: cleanEmail(merged.emailFromAddress, DEFAULT_SITE_CONTENT.emailFromAddress),
      emailSubject: cleanText(merged.emailSubject, DEFAULT_SITE_CONTENT.emailSubject),
      emailIntro: cleanText(merged.emailIntro, DEFAULT_SITE_CONTENT.emailIntro),
      geminiEndpoint: cleanEndpoint(merged.geminiEndpoint, DEFAULT_SETTINGS.geminiEndpoint),
      geminiModel: cleanText(merged.geminiModel, DEFAULT_SETTINGS.geminiModel),
      adsClient: cleanOptionalText(merged.adsClient),
      adsSlot: cleanOptionalText(merged.adsSlot),
      checkoutUrl: cleanOptionalUrl(merged.checkoutUrl),
      jitsiDomain: cleanDomain(merged.jitsiDomain, DEFAULT_SETTINGS.jitsiDomain),
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

  function cleanOptionalText(value) {
    return String(value || "").trim();
  }

  function cleanEndpoint(value, fallback) {
    const text = cleanOptionalText(value);
    if (!text) return fallback;
    if (text.startsWith("/")) return text;
    try {
      const url = new URL(text);
      return url.protocol === "https:" ? text : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function cleanOptionalUrl(value) {
    const text = cleanOptionalText(value);
    if (!text) return "";
    try {
      const url = new URL(text);
      return url.protocol === "https:" ? text : "";
    } catch (error) {
      return "";
    }
  }

  function cleanDomain(value, fallback) {
    const text = cleanOptionalText(value).replace(/^https?:\/\//, "").replace(/\/.*$/, "");
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

  function renderReadyCaseTable(rows) {
    if (!rows.length) {
      els.adminReadyCases.innerHTML = `<div class="empty-state">No AI-ready cases yet.</div>`;
      return;
    }
    els.adminReadyCases.innerHTML = rows.map((row) => renderCaseRow(row, true)).join("");
  }

  function renderConversationTable(rows) {
    if (!rows.length) {
      els.adminConversations.innerHTML = `<div class="empty-state">No conversations yet.</div>`;
      return;
    }
    els.adminConversations.innerHTML = rows.map((row) => renderCaseRow(row, false)).join("");
  }

  function renderCaseRow(row, readyList) {
    const vehicle = row.vehicle || {};
    const messages = Array.isArray(row.messages) ? row.messages : [];
    const vehicleText = [vehicle.year, vehicle.make, vehicle.model, vehicle.mileage ? `(${vehicle.mileage})` : ""].filter(Boolean).join(" ") || "Unknown vehicle";
    const lastCustomerNote = [...messages].reverse().find((message) => message.role === "user")?.content || "No customer note captured.";
    const status = isReadyCase(row) ? "Ready for mechanic" : "AI collecting details";
    const brief = cleanText(row.brief, "");
    const summaryClass = readyList ? "admin-row case-ready" : "admin-row";
    return `
      <details class="${summaryClass}">
        <summary>
          <span>
            <strong>${escapeHtml(row.title || "Mechanic case")}</strong>
            <small>${escapeHtml(status)} - ${escapeHtml(vehicleText)} - ${formatDate(row.updated_at)}</small>
          </span>
          <span>${escapeHtml(messageCountLabel(messages))}</span>
        </summary>
        <div class="case-detail-grid">
          <div>
            <span class="vehicle-label">Owner ID</span>
            <span class="vehicle-value dark">${escapeHtml(row.owner_id || "Unknown")}</span>
          </div>
          <div>
            <span class="vehicle-label">Last customer note</span>
            <span class="vehicle-value dark">${escapeHtml(lastCustomerNote)}</span>
          </div>
        </div>
        ${brief ? `<div class="case-brief"><strong>Private technician brief</strong><pre>${escapeHtml(brief)}</pre></div>` : ""}
        <div class="case-transcript">
          ${messages.map(renderMessageLine).join("") || `<div class="empty-state">No transcript yet.</div>`}
        </div>
      </details>
    `;
  }

  function renderMessageLine(message) {
    const role = message.role === "user" ? "Customer" : "AI";
    const flags = [message.handoff ? "handoff" : "", message.alert ? "safety" : ""].filter(Boolean).join(", ");
    return `
      <article class="transcript-line ${message.role === "user" ? "customer" : "assistant"}">
        <strong>${escapeHtml(role)}${flags ? ` - ${escapeHtml(flags)}` : ""}</strong>
        <p>${escapeHtml(message.content || "")}</p>
        <span>${formatDate(message.createdAt || message.created_at)}</span>
      </article>
    `;
  }

  function isReadyCase(row) {
    const messages = Array.isArray(row.messages) ? row.messages : [];
    return Boolean(
      cleanText(row.brief, "") ||
        messages.some((message) => message.handoff) ||
        messages.some((message) => message.role === "assistant" && /voice or video|reserve|live mechanic|continue/i.test(message.content || ""))
    );
  }

  function messageCountLabel(messages) {
    const customerCount = messages.filter((message) => message.role === "user").length;
    return `${customerCount} customer ${customerCount === 1 ? "note" : "notes"}`;
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
