(function () {
  const SETTINGS_KEY = "wrenchline.settings";
  const BOOT_CONFIG = window.WRENCHLINE_CONFIG || {};
  const DEFAULT_SETTINGS = {
    supabaseUrl: "",
    supabaseAnonKey: "",
    ...BOOT_CONFIG,
  };

  const els = {};
  const state = {
    settings: loadSettings(),
    supabase: null,
    user: null,
    profile: null,
  };

  document.addEventListener("DOMContentLoaded", init);

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
      "adminEmailInput",
      "adminPasswordInput",
      "adminMessage",
      "adminLoginBtn",
      "refreshAdminBtn",
      "adminStats",
      "adminConversations",
      "adminBookings",
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    els.adminLoginForm.addEventListener("submit", login);
    els.adminLogoutBtn.addEventListener("click", logout);
    els.refreshAdminBtn.addEventListener("click", verifyAdminAndLoad);
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
    state.settings.supabaseUrl = els.adminSupabaseUrlInput.value.trim();
    state.settings.supabaseAnonKey = els.adminSupabaseAnonInput.value.trim();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...loadSettings(), ...state.settings }));
    await connectSupabase();

    if (!state.supabase) {
      renderLoggedOut("Supabase is not configured.");
      return;
    }

    els.adminLoginBtn.disabled = true;
    els.adminMessage.textContent = "Logging in...";
    try {
      const { error } = await state.supabase.auth.signInWithPassword({
        email: els.adminEmailInput.value.trim(),
        password: els.adminPasswordInput.value,
      });
      if (error) throw error;
      await refreshUser();
      await verifyAdminAndLoad();
    } catch (error) {
      renderLoggedOut(error.message || "Admin login failed.");
    } finally {
      els.adminLoginBtn.disabled = false;
    }
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
    await loadDashboard();
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
            <span>${escapeHtml(row.duration_minutes || 0)} min · $${escapeHtml(row.total_usd || 0)}</span>
            <span>${escapeHtml(row.status || "pending")} · ${formatDate(row.created_at)}</span>
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
