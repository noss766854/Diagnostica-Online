(function () {
  const SETTINGS_KEY = "wrenchline.settings";
  const BOOT_CONFIG = window.WRENCHLINE_CONFIG || {};
  const DEFAULT_SETTINGS = {
    supabaseUrl: "",
    supabaseAnonKey: "",
    geminiEndpoint: "/api/gemini",
    geminiModel: "gemini-2.5-flash",
    adsClient: "ca-pub-6817388263556075",
    adsSlot: "",
    adSlots: {},
    checkoutUrl: "/api/checkout",
    jitsiDomain: "meet.jit.si",
    ...BOOT_CONFIG,
  };

  const DEFAULT_SITE_CONTENT = {
    assistantName: "Gemini Diagnostic AI",
    assistantAvatarText: "AI",
    welcomeMessage:
      "Hi, I'm your AI mechanic. Tell me the year, make, model, mileage, symptoms, warning lights, sounds, smells, and when the issue happens. I will work through the diagnosis with you.",
    typingMessage: "Gemini is reviewing your symptoms...",
    systemPrompt:
      "You are Gemini Diagnostic AI for DiagnosticaOnline. You are the primary AI diagnostician, not an intake assistant. Own the case from initial questions through test planning and interpretation. Do not offer human contact during a normal case. Request human review only when you cannot continue safely or reliably after reasonable remote diagnostics. Never show the customer internal notes or routing metadata.",
    autonomousMode: true,
    escalationPolicy:
      "Escalate only after the AI has used the available vehicle details and reasonable remote tests and still needs human judgment. Do not escalate merely because more information or another test is needed.",
    escalationCustomerMessage:
      "This case needs a human review before I can guide you further safely. I have sent only the relevant case details to the review queue.",
    handoffAfterMessages: 3,
    handoffMessage:
      "I have enough detail for {technicianName} to continue. You can start a free technician text chat, or reserve a paid voice or video call whenever you're ready.",
    technicianName: "Elena M.",
    technicianTitle: "Diagnostic Technician",
    technicianStats: "4,218 satisfied drivers",
    technicianExperience: "22 years diagnosing drivability, brake, and electrical issues",
    technicianAvatar:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=160&q=80",
    emailFromName: "DiagnosticaOnline",
    emailFromAddress: "verify@diagnostica-online.com",
    emailSubject: "Verify your DiagnosticaOnline account",
    emailIntro: "Confirm your email so your mechanic conversations stay saved to your account.",
    supportEmail: "support@diagnostica-online.com",
    businessAddress: "Add your business address in admin.",
    serviceArea: "Remote mechanic consulting",
    responseTimeCopy: "A technician will reply as soon as one is available.",
    emergencyDisclaimer:
      "If the vehicle may be unsafe, leaking fuel, smoking, losing brakes, or overheating severely, stop driving and contact local emergency or roadside assistance.",
    staffNotificationEmail: "support@diagnostica-online.com",
    textChatStartedMessage:
      "Free technician text chat is open. Keep typing in this same conversation and a technician can answer from the dashboard.",
    textChatWaitingMessage: "A technician has your case. Keep this page open or check saved cases for replies.",
    bookingConfirmationSubject: "Your DiagnosticaOnline mechanic booking",
    textChatConfirmationSubject: "Your DiagnosticaOnline technician text chat",
    videoRateUsd: 40,
    voiceRateUsd: 20,
    minimumCallMinutes: 30,
    maximumCallMinutes: 240,
    durationOptions: "30,60,90,120",
    refundPolicySummary: "Paid calls can be refunded or rescheduled if no technician joins the scheduled session.",
    consentEnabled: true,
    consentTitle: "Cookie and ad consent",
    consentBody:
      "We use essential storage for login and saved cases. With your consent, we also use ads to keep free text help available.",
    consentAcceptText: "Accept ads",
    consentRejectText: "Essential only",
    termsText:
      "DiagnosticaOnline provides AI-assisted automotive diagnostics, saved cases, file storage, free text chat when available, and optional paid voice or video consulting. Guidance is informational, may be incomplete, and does not replace an in-person inspection, factory service information, recall check, repair estimate, or safety inspection. You must have lawful authority to diagnose or modify the vehicle and remain responsible for safe tools, lifting, isolation, protective equipment, and deciding whether the vehicle can be operated.",
    privacyText:
      "We collect account details; vehicle information such as VIN or ECU identifiers when supplied; symptoms, DTCs, messages, uploads, AI usage and token estimates; booking/payment identifiers; and technical security logs. We use this data to provide and secure the service, enforce plan limits, send account or booking emails, and improve diagnostics. Data may be processed by Supabase, the configured AI provider, Resend, Stripe, Jitsi, and, after consent on free plans, Google AdSense. Contact the listed support address for access or deletion requests, subject to legal and fraud-prevention retention duties.",
    cookieText:
      "We use essential browser storage for login state, saved drafts, consent choices, and site preferences. Advertising is disabled for premium and admin plans. On free plans, Google AdSense may use cookies or similar technologies only after ad consent is accepted. Choosing Essential only keeps ad storage and personalized ad loading disabled.",
    refundText:
      "Free text chat is not charged. Paid voice or video calls are charged based on the selected duration and rate shown at checkout. Add your final refund, cancellation, no-show, and rescheduling rules in admin before accepting production payments.",
    disclaimerText:
      "AI intake and remote consulting are not emergency services and cannot guarantee a diagnosis or repair. Vehicle work can involve fire, fuel, toxic chemicals, high voltage, moving components, stored pressure, air bags, and crushing hazards. Stop driving and seek qualified local help for smoke, fire risk, fuel leaks, brake or steering loss, severe overheating, oil-pressure warnings, or other immediate danger. ECU, immobilizer, and emissions laws vary by location. DiagnosticaOnline refuses emissions defeat, immobilizer bypass without lawful ownership procedures, odometer fraud, theft enablement, and unsafe bypass instructions, while allowing lawful diagnostics, repair, and restoration of original or factory software.",
    geminiEndpoint: DEFAULT_SETTINGS.geminiEndpoint,
    geminiModel: DEFAULT_SETTINGS.geminiModel,
    adsClient: DEFAULT_SETTINGS.adsClient,
    adsSlot: DEFAULT_SETTINGS.adsSlot,
    adSlots: {
      topBanner: "",
      leftTop: "",
      leftUpper: "",
      leftMiddle: "",
      leftLower: "",
      leftBottom: "",
      rightTop: "",
      rightUpper: "",
      rightMiddle: "",
      rightLower: "",
      rightBottom: "",
      inlineOne: "",
      inlineTwo: "",
      mobileChat: "",
      bottomBanner: "",
    },
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
    platform: {
      profiles: [],
      plans: [],
      cases: [],
      uploads: [],
      usage: [],
      usageSummary: {},
      tools: [],
    },
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
      "adminStaffCard",
      "adminUsers",
      "adminReadyCases",
      "adminConversations",
      "adminBookings",
      "platformUsageStats",
      "platformUsageByUser",
      "platformCases",
      "platformUploads",
      "recommendedToolForm",
      "recommendedToolId",
      "recommendedToolName",
      "recommendedToolCategory",
      "recommendedToolDescription",
      "recommendedToolUrl",
      "recommendedToolTags",
      "recommendedToolDtc",
      "recommendedToolPriority",
      "recommendedToolActive",
      "recommendedToolMessage",
      "resetRecommendedToolBtn",
      "saveRecommendedToolBtn",
      "recommendedTools",
      "siteContentForm",
      "assistantNameInput",
      "assistantAvatarTextInput",
      "welcomeMessageInput",
      "systemPromptInput",
      "autonomousModeInput",
      "escalationPolicyInput",
      "escalationCustomerMessageInput",
      "technicianNameInput",
      "technicianTitleInput",
      "technicianStatsInput",
      "technicianExperienceInput",
      "technicianAvatarInput",
      "emailFromNameInput",
      "emailFromAddressInput",
      "emailSubjectInput",
      "emailIntroInput",
      "supportEmailInput",
      "staffNotificationEmailInput",
      "businessAddressInput",
      "serviceAreaInput",
      "responseTimeCopyInput",
      "emergencyDisclaimerInput",
      "textChatStartedMessageInput",
      "textChatWaitingMessageInput",
      "bookingConfirmationSubjectInput",
      "textChatConfirmationSubjectInput",
      "geminiEndpointInput",
      "geminiModelInput",
      "adsClientInput",
      "adsSlotInput",
      "adSlotTopBannerInput",
      "adSlotLeftTopInput",
      "adSlotLeftUpperInput",
      "adSlotLeftMiddleInput",
      "adSlotLeftLowerInput",
      "adSlotLeftBottomInput",
      "adSlotRightTopInput",
      "adSlotRightUpperInput",
      "adSlotRightMiddleInput",
      "adSlotRightLowerInput",
      "adSlotRightBottomInput",
      "adSlotInlineOneInput",
      "adSlotInlineTwoInput",
      "adSlotMobileChatInput",
      "adSlotBottomBannerInput",
      "checkoutUrlInput",
      "jitsiDomainInput",
      "videoRateUsdInput",
      "voiceRateUsdInput",
      "minimumCallMinutesInput",
      "maximumCallMinutesInput",
      "durationOptionsInput",
      "refundPolicySummaryInput",
      "consentEnabledInput",
      "consentTitleInput",
      "consentBodyInput",
      "consentAcceptTextInput",
      "consentRejectTextInput",
      "termsTextInput",
      "privacyTextInput",
      "cookieTextInput",
      "refundTextInput",
      "disclaimerTextInput",
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
    els.recommendedToolForm.addEventListener("submit", saveRecommendedTool);
    els.resetRecommendedToolBtn.addEventListener("click", resetRecommendedToolForm);
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
    if (!["admin", "mechanic"].includes(state.profile?.role)) {
      renderLoggedOut("This Supabase user is not marked as staff.");
      return;
    }

    els.adminLoginCard.hidden = true;
    els.adminDashboard.hidden = false;
    const isAdmin = state.profile.role === "admin";
    if (els.adminStaffCard) els.adminStaffCard.hidden = !isAdmin;
    if (els.siteContentForm) els.siteContentForm.closest(".admin-table-card").hidden = !isAdmin;
    if (els.configStatus) els.configStatus.closest(".admin-table-card").hidden = !isAdmin;
    renderAccount();
    await loadSiteContent();
    await loadConfigStatus();
    await loadDashboard();
    if (isAdmin) await loadPlatformDashboard();
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
    const [conversationCount, bookingCount, userCount, conversations, bookings, profiles] = await Promise.all([
      countRows("conversations"),
      countRows("call_bookings"),
      countRows("profiles"),
      state.supabase
        .from("conversations")
        .select("id,title,owner_id,vehicle,messages,brief,status,priority,assigned_mechanic_id,created_at,updated_at")
        .order("updated_at", { ascending: false })
        .limit(50),
      state.supabase
        .from("call_bookings")
        .select("id,owner_id,customer_email,call_type,duration_minutes,total_usd,meeting_url,scheduled_start_at,status,created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      state.supabase
        .from("profiles")
        .select("id,email,display_name,role,availability_status,mechanic_title,updated_at")
        .order("email", { ascending: true })
        .limit(100),
    ]);
    const conversationRows = conversations.data || [];
    const readyRows = conversationRows.filter(isReadyCase);
    const profileRows = profiles.data || [];
    const mechanicRows = profileRows.filter((profile) => ["mechanic", "admin"].includes(profile.role));

    els.adminStats.innerHTML = [
      ["Conversations", conversationCount],
      ["AI exceptions", readyRows.length],
      ["Call bookings", bookingCount],
      ["Users", userCount],
    ]
      .map((stat) => `<div class="stat-card"><span>${escapeHtml(stat[0])}</span><strong>${escapeHtml(stat[1])}</strong></div>`)
      .join("");

    renderReadyCaseTable(readyRows, mechanicRows);
    renderConversationTable(conversationRows, mechanicRows);
    renderBookingTable(bookings.data || []);
    renderUserTable(profileRows);
    bindTechnicianReplyForms();
    bindCaseWorkflowForms();
    bindUserRoleForms();
    createIcons();
  }

  async function loadPlatformDashboard() {
    setPlatformLoading();
    try {
      const data = await adminPlatformRequest("/api/admin/platform");
      state.platform = data;
      renderPlatformUsage(data);
      renderPlatformUsers(data.profiles || [], data.plans || []);
      renderPlatformCases(data.cases || [], data.profiles || []);
      renderPlatformUploads(data.uploads || [], data.cases || [], data.profiles || []);
      renderRecommendedTools(data.tools || []);
      els.adminStats.insertAdjacentHTML(
        "beforeend",
        `<div class="stat-card"><span>Structured cases</span><strong>${escapeHtml((data.cases || []).length)}</strong></div>`
      );
      bindPlatformUserForms();
      bindPlatformCaseForms();
      bindRecommendedToolActions();
      createIcons();
    } catch (error) {
      const message = escapeHtml(error.message || "Platform data is unavailable. Run the latest Supabase schema.");
      [els.platformUsageStats, els.platformUsageByUser, els.platformCases, els.platformUploads, els.recommendedTools].forEach((element) => {
        if (element) element.innerHTML = `<div class="empty-state">${message}</div>`;
      });
    }
  }

  function setPlatformLoading() {
    [els.platformUsageStats, els.platformUsageByUser, els.platformCases, els.platformUploads, els.recommendedTools].forEach((element) => {
      if (element) element.innerHTML = `<div class="empty-state">Loading platform data...</div>`;
    });
  }

  function renderPlatformUsage(data) {
    const summary = data.usageSummary || {};
    els.platformUsageStats.innerHTML = [
      ["AI messages", summary.aiMessages || 0],
      ["Input tokens", formatNumber(summary.inputTokens || 0)],
      ["Output tokens", formatNumber(summary.outputTokens || 0)],
      ["Estimated AI cost", `$${Number(summary.estimatedCostUsd || 0).toFixed(4)}`],
      ["Uploads", summary.uploads || 0],
      ["Cases created", summary.casesCreated || 0],
      ["Human-review exceptions", summary.escalations || 0],
    ]
      .map(([label, value]) => `<div class="stat-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`)
      .join("");

    const profiles = new Map((data.profiles || []).map((profile) => [profile.id, profile]));
    const grouped = new Map();
    (data.usage || [])
      .filter((event) => event.event_type === "ai_message")
      .forEach((event) => {
        const current = grouped.get(event.user_id) || { messages: 0, input: 0, output: 0, cost: 0, models: new Set() };
        current.messages += 1;
        current.input += Number(event.input_tokens || 0);
        current.output += Number(event.output_tokens || 0);
        current.cost += Number(event.estimated_cost_usd || 0);
        if (event.model) current.models.add(event.model);
        grouped.set(event.user_id, current);
      });
    const rows = Array.from(grouped.entries()).sort((a, b) => b[1].messages - a[1].messages);
    els.platformUsageByUser.innerHTML = rows.length
      ? rows
          .slice(0, 50)
          .map(([userId, usage]) => {
            const profile = profiles.get(userId) || {};
            return `
              <div class="admin-row usage-row">
                <span><strong>${escapeHtml(profile.email || userId)}</strong><small>${escapeHtml(Array.from(usage.models).join(", ") || "No model")}</small></span>
                <span>${escapeHtml(`${usage.messages} messages`)}</span>
                <span>${escapeHtml(`${formatNumber(usage.input + usage.output)} tokens`)}</span>
                <span>${escapeHtml(`$${usage.cost.toFixed(4)}`)}</span>
              </div>
            `;
          })
          .join("")
      : `<div class="empty-state">No AI usage recorded in the last 30 days.</div>`;
  }

  function renderPlatformUsers(profiles, plans) {
    const planMap = new Map(plans.map((plan) => [plan.user_id, plan]));
    els.adminUsers.innerHTML = profiles.length
      ? profiles
          .map((profile) => {
            const plan = planMap.get(profile.id) || { plan_tier: profile.role === "admin" ? "admin" : "free", status: "active" };
            return `
              <form class="admin-row platform-user-form" data-user-id="${escapeAttr(profile.id)}">
                <span>
                  <strong>${escapeHtml(profile.email || "No email")}</strong>
                  <small>${escapeHtml(profile.display_name || profile.id)}</small>
                </span>
                <select name="role" aria-label="Role for ${escapeAttr(profile.email || profile.id)}">
                  ${workflowOption("customer", "Customer", profile.role)}
                  ${workflowOption("mechanic", "Mechanic", profile.role)}
                  ${workflowOption("admin", "Admin", profile.role)}
                </select>
                <select name="planTier" aria-label="Plan for ${escapeAttr(profile.email || profile.id)}">
                  ${workflowOption("free", "Free", plan.plan_tier)}
                  ${workflowOption("premium", "Premium", plan.plan_tier)}
                  ${workflowOption("admin", "Admin", plan.plan_tier)}
                </select>
                <select name="planStatus" aria-label="Plan status for ${escapeAttr(profile.email || profile.id)}">
                  ${workflowOption("active", "Active", plan.status)}
                  ${workflowOption("trialing", "Trialing", plan.status)}
                  ${workflowOption("past_due", "Past due", plan.status)}
                  ${workflowOption("canceled", "Canceled", plan.status)}
                </select>
                <label class="disable-control">
                  <input name="isDisabled" type="checkbox" ${profile.is_disabled ? "checked" : ""} />
                  <span>Disabled</span>
                </label>
                <input name="disabledReason" type="text" maxlength="500" value="${escapeAttr(profile.disabled_reason || "")}" placeholder="Reason" />
                <button class="secondary-button" type="submit"><i data-lucide="save"></i><span>Save</span></button>
              </form>
            `;
          })
          .join("")
      : `<div class="empty-state">No users found.</div>`;
  }

  function renderPlatformCases(cases, profiles) {
    const mechanics = profiles.filter((profile) => ["admin", "mechanic"].includes(profile.role));
    const orderedCases = [...cases].sort((left, right) => Number(isHumanReviewCase(right)) - Number(isHumanReviewCase(left)));
    els.platformCases.innerHTML = orderedCases.length
      ? orderedCases
          .map((diagnosticCase) => {
            const vehicle = diagnosticCase.vehicle || {};
            return `
              <details class="admin-row platform-case-row ${diagnosticCase.priority === "urgent" ? "case-urgent" : ""}">
                <summary>
                  <span>
                    <strong>${escapeHtml(diagnosticCase.title)}</strong>
                    <small>${escapeHtml(`${formatLabel(diagnosticCase.status)} - ${vehicle.year || ""} ${vehicle.make || ""} ${vehicle.model || ""} - ${formatDate(diagnosticCase.updated_at)}`)}</small>
                  </span>
                  <span>${escapeHtml((diagnosticCase.dtc_codes || []).join(", ") || "No DTCs")}</span>
                </summary>
                <div class="case-detail-grid">
                  <div><span class="vehicle-label">Vehicle</span><span class="vehicle-value dark">${escapeHtml(`${vehicle.year || ""} ${vehicle.make || ""} ${vehicle.model || ""} - ${vehicle.engine || "Unknown engine"}`)}</span></div>
                  <div><span class="vehicle-label">Symptoms</span><span class="vehicle-value dark">${escapeHtml(diagnosticCase.symptoms || "None")}</span></div>
                  <div><span class="vehicle-label">Previous work</span><span class="vehicle-value dark">${escapeHtml(diagnosticCase.previous_work || "None")}</span></div>
                  <div><span class="vehicle-label">Owner ID</span><span class="vehicle-value dark">${escapeHtml(diagnosticCase.owner_id)}</span></div>
                </div>
                ${diagnosticCase.escalation ? `<div class="case-brief"><strong>Why AI requested human review</strong><pre>${escapeHtml(diagnosticCase.escalation.escalation_reason || "Human judgment is required to continue reliably.")}</pre></div>` : ""}
                <form class="platform-case-form" data-case-id="${escapeAttr(diagnosticCase.id)}">
                  <label><span>Status</span><select name="status">
                    ${workflowOption("active", "Active", diagnosticCase.status)}
                    ${workflowOption("waiting_for_mechanic", "Needs human review", diagnosticCase.status)}
                    ${workflowOption("assigned", "Assigned", diagnosticCase.status)}
                    ${workflowOption("resolved", "Resolved", diagnosticCase.status)}
                    ${workflowOption("archived", "Archived", diagnosticCase.status)}
                  </select></label>
                  <label><span>Priority</span><select name="priority">
                    ${workflowOption("low", "Low", diagnosticCase.priority)}
                    ${workflowOption("normal", "Normal", diagnosticCase.priority)}
                    ${workflowOption("urgent", "Urgent", diagnosticCase.priority)}
                  </select></label>
                  <label><span>Assigned reviewer</span><select name="assignedMechanicId">
                    <option value="">Unassigned</option>
                    ${mechanics.map((profile) => workflowOption(profile.id, profile.display_name || profile.email || "Mechanic", diagnosticCase.assigned_mechanic_id || "")).join("")}
                  </select></label>
                  <label class="platform-case-reply"><span>Human review reply</span><textarea name="reply" rows="3" maxlength="5000" placeholder="Reply only when the AI exception genuinely needs your judgment..."></textarea></label>
                  <button class="solid-button" type="submit"><i data-lucide="send-horizontal"></i><span>Update case</span></button>
                </form>
              </details>
            `;
          })
          .join("")
      : `<div class="empty-state">No structured diagnostic cases yet.</div>`;
  }

  function renderPlatformUploads(uploads, cases, profiles) {
    const caseMap = new Map(cases.map((item) => [item.id, item]));
    const profileMap = new Map(profiles.map((item) => [item.id, item]));
    els.platformUploads.innerHTML = uploads.length
      ? uploads
          .map((upload) => {
            const diagnosticCase = caseMap.get(upload.case_id) || {};
            const profile = profileMap.get(upload.owner_id) || {};
            return `
              <div class="admin-row upload-admin-row">
                <span><strong>${escapeHtml(upload.file_name)}</strong><small>${escapeHtml(formatLabel(upload.upload_kind))} - ${escapeHtml(formatFileSize(upload.size_bytes))}</small></span>
                <span>${escapeHtml(diagnosticCase.title || upload.case_id)}</span>
                <span>${escapeHtml(profile.email || upload.owner_id)}</span>
                <span>${escapeHtml(`${formatLabel(upload.analysis_status)} - ${formatDate(upload.created_at)}`)}</span>
              </div>
            `;
          })
          .join("")
      : `<div class="empty-state">No diagnostic uploads yet.</div>`;
  }

  function renderRecommendedTools(tools) {
    els.recommendedTools.innerHTML = tools.length
      ? tools
          .map(
            (tool) => `
              <div class="admin-row recommended-tool-row ${tool.active ? "" : "disabled-row"}">
                <span><strong>${escapeHtml(tool.name)}</strong><small>${escapeHtml(formatLabel(tool.category))}</small></span>
                <span>${escapeHtml((tool.rule_tags || []).join(", ") || "No tags")}</span>
                <span>${escapeHtml((tool.dtc_prefixes || []).join(", ") || "No DTC prefixes")}</span>
                <span>${tool.active ? "Active" : "Disabled"}</span>
                <button class="secondary-button edit-tool-button" type="button" data-tool-id="${escapeAttr(tool.id)}"><i data-lucide="pencil"></i><span>Edit</span></button>
                ${tool.active ? `<button class="icon-link dark disable-tool-button" type="button" data-tool-id="${escapeAttr(tool.id)}" title="Disable tool" aria-label="Disable ${escapeAttr(tool.name)}"><i data-lucide="circle-off"></i></button>` : ""}
              </div>
            `
          )
          .join("")
      : `<div class="empty-state">No affiliate tools configured. Add one above to enable rule-based recommendations.</div>`;
  }

  function bindPlatformUserForms() {
    Array.from(document.querySelectorAll(".platform-user-form")).forEach((form) => form.addEventListener("submit", updatePlatformUser));
  }

  function bindPlatformCaseForms() {
    Array.from(document.querySelectorAll(".platform-case-form")).forEach((form) => form.addEventListener("submit", updatePlatformCase));
  }

  function bindRecommendedToolActions() {
    Array.from(document.querySelectorAll(".edit-tool-button")).forEach((button) => button.addEventListener("click", editRecommendedTool));
    Array.from(document.querySelectorAll(".disable-tool-button")).forEach((button) => button.addEventListener("click", disableRecommendedTool));
  }

  async function updatePlatformUser(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button[type='submit']");
    button.disabled = true;
    try {
      await adminPlatformRequest("/api/admin/platform", {
        method: "PATCH",
        body: JSON.stringify({
          action: "update_user",
          userId: form.dataset.userId,
          role: form.elements.role.value,
          planTier: form.elements.planTier.value,
          planStatus: form.elements.planStatus.value,
          isDisabled: form.elements.isDisabled.checked,
          disabledReason: form.elements.disabledReason.value.trim(),
        }),
      });
      await loadPlatformDashboard();
    } catch (error) {
      reportFormError(form, error.message || "The user could not be updated.");
    } finally {
      button.disabled = false;
    }
  }

  async function updatePlatformCase(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector("button[type='submit']");
    button.disabled = true;
    try {
      await adminPlatformRequest("/api/admin/platform", {
        method: "PATCH",
        body: JSON.stringify({
          action: "update_case",
          caseId: form.dataset.caseId,
          status: form.elements.status.value,
          priority: form.elements.priority.value,
          assignedMechanicId: form.elements.assignedMechanicId.value || null,
          reply: form.elements.reply.value.trim(),
        }),
      });
      await loadPlatformDashboard();
    } catch (error) {
      reportFormError(form, error.message || "The diagnostic case could not be updated.");
    } finally {
      button.disabled = false;
    }
  }

  async function saveRecommendedTool(event) {
    event.preventDefault();
    els.saveRecommendedToolBtn.disabled = true;
    els.recommendedToolMessage.textContent = "Saving tool...";
    try {
      await adminPlatformRequest("/api/admin/platform", {
        method: "PATCH",
        body: JSON.stringify({
          action: "upsert_tool",
          toolId: els.recommendedToolId.value || undefined,
          name: els.recommendedToolName.value.trim(),
          category: els.recommendedToolCategory.value,
          description: els.recommendedToolDescription.value.trim(),
          affiliateUrl: els.recommendedToolUrl.value.trim(),
          imageUrl: "",
          ruleTags: commaList(els.recommendedToolTags.value),
          dtcPrefixes: commaList(els.recommendedToolDtc.value).map((value) => value.toUpperCase()),
          priority: Number(els.recommendedToolPriority.value || 100),
          active: els.recommendedToolActive.value === "true",
        }),
      });
      resetRecommendedToolForm();
      els.recommendedToolMessage.textContent = "Tool saved.";
      await loadPlatformDashboard();
    } catch (error) {
      els.recommendedToolMessage.textContent = error.message || "The recommended tool could not be saved.";
    } finally {
      els.saveRecommendedToolBtn.disabled = false;
    }
  }

  function editRecommendedTool(event) {
    const tool = (state.platform.tools || []).find((item) => item.id === event.currentTarget.dataset.toolId);
    if (!tool) return;
    els.recommendedToolId.value = tool.id;
    els.recommendedToolName.value = tool.name || "";
    els.recommendedToolCategory.value = tool.category || "other";
    els.recommendedToolDescription.value = tool.description || "";
    els.recommendedToolUrl.value = tool.affiliate_url || "";
    els.recommendedToolTags.value = (tool.rule_tags || []).join(", ");
    els.recommendedToolDtc.value = (tool.dtc_prefixes || []).join(", ");
    els.recommendedToolPriority.value = tool.priority || 100;
    els.recommendedToolActive.value = String(tool.active !== false);
    els.recommendedToolMessage.textContent = `Editing ${tool.name}`;
    els.recommendedToolName.focus();
  }

  async function disableRecommendedTool(event) {
    const toolId = event.currentTarget.dataset.toolId;
    try {
      await adminPlatformRequest("/api/admin/platform", {
        method: "PATCH",
        body: JSON.stringify({ action: "disable_tool", toolId }),
      });
      await loadPlatformDashboard();
    } catch (error) {
      els.recommendedToolMessage.textContent = error.message || "The tool could not be disabled.";
    }
  }

  function resetRecommendedToolForm() {
    els.recommendedToolForm.reset();
    els.recommendedToolId.value = "";
    els.recommendedToolPriority.value = "100";
    els.recommendedToolActive.value = "true";
    els.recommendedToolMessage.textContent = "";
  }

  async function adminPlatformRequest(url, options = {}) {
    const { data } = await state.supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error("Admin login is required.");
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "The admin request failed.");
    return payload;
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
      autonomousMode: els.autonomousModeInput.value === "true",
      escalationPolicy: els.escalationPolicyInput.value,
      escalationCustomerMessage: els.escalationCustomerMessageInput.value,
      technicianName: els.technicianNameInput.value,
      technicianTitle: els.technicianTitleInput.value,
      technicianStats: els.technicianStatsInput.value,
      technicianExperience: els.technicianExperienceInput.value,
      technicianAvatar: els.technicianAvatarInput.value,
      emailFromName: els.emailFromNameInput.value,
      emailFromAddress: els.emailFromAddressInput.value,
      emailSubject: els.emailSubjectInput.value,
      emailIntro: els.emailIntroInput.value,
      supportEmail: els.supportEmailInput.value,
      staffNotificationEmail: els.staffNotificationEmailInput.value,
      businessAddress: els.businessAddressInput.value,
      serviceArea: els.serviceAreaInput.value,
      responseTimeCopy: els.responseTimeCopyInput.value,
      emergencyDisclaimer: els.emergencyDisclaimerInput.value,
      textChatStartedMessage: els.textChatStartedMessageInput.value,
      textChatWaitingMessage: els.textChatWaitingMessageInput.value,
      bookingConfirmationSubject: els.bookingConfirmationSubjectInput.value,
      textChatConfirmationSubject: els.textChatConfirmationSubjectInput.value,
      geminiEndpoint: els.geminiEndpointInput.value,
      geminiModel: els.geminiModelInput.value,
      adsClient: els.adsClientInput.value,
      adsSlot: els.adsSlotInput.value,
      adSlots: {
        topBanner: els.adSlotTopBannerInput.value,
        leftTop: els.adSlotLeftTopInput.value,
        leftUpper: els.adSlotLeftUpperInput.value,
        leftMiddle: els.adSlotLeftMiddleInput.value,
        leftLower: els.adSlotLeftLowerInput.value,
        leftBottom: els.adSlotLeftBottomInput.value,
        rightTop: els.adSlotRightTopInput.value,
        rightUpper: els.adSlotRightUpperInput.value,
        rightMiddle: els.adSlotRightMiddleInput.value,
        rightLower: els.adSlotRightLowerInput.value,
        rightBottom: els.adSlotRightBottomInput.value,
        inlineOne: els.adSlotInlineOneInput.value,
        inlineTwo: els.adSlotInlineTwoInput.value,
        mobileChat: els.adSlotMobileChatInput.value,
        bottomBanner: els.adSlotBottomBannerInput.value,
      },
      checkoutUrl: els.checkoutUrlInput.value,
      jitsiDomain: els.jitsiDomainInput.value,
      videoRateUsd: els.videoRateUsdInput.value,
      voiceRateUsd: els.voiceRateUsdInput.value,
      minimumCallMinutes: els.minimumCallMinutesInput.value,
      maximumCallMinutes: els.maximumCallMinutesInput.value,
      durationOptions: els.durationOptionsInput.value,
      refundPolicySummary: els.refundPolicySummaryInput.value,
      consentEnabled: els.consentEnabledInput.value === "true",
      consentTitle: els.consentTitleInput.value,
      consentBody: els.consentBodyInput.value,
      consentAcceptText: els.consentAcceptTextInput.value,
      consentRejectText: els.consentRejectTextInput.value,
      termsText: els.termsTextInput.value,
      privacyText: els.privacyTextInput.value,
      cookieText: els.cookieTextInput.value,
      refundText: els.refundTextInput.value,
      disclaimerText: els.disclaimerTextInput.value,
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
      await logAdminAction("site_settings_updated", "site_settings", "public_content", {
        changedAt: new Date().toISOString(),
      });
      els.siteContentMessage.textContent = "Saved. The public site will use these autonomous AI, exception-routing, ad, call, and email settings.";
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
    els.autonomousModeInput.value = String(content.autonomousMode !== false);
    els.escalationPolicyInput.value = content.escalationPolicy;
    els.escalationCustomerMessageInput.value = content.escalationCustomerMessage;
    els.technicianNameInput.value = content.technicianName;
    els.technicianTitleInput.value = content.technicianTitle;
    els.technicianStatsInput.value = content.technicianStats;
    els.technicianExperienceInput.value = content.technicianExperience;
    els.technicianAvatarInput.value = content.technicianAvatar;
    els.emailFromNameInput.value = content.emailFromName;
    els.emailFromAddressInput.value = content.emailFromAddress;
    els.emailSubjectInput.value = content.emailSubject;
    els.emailIntroInput.value = content.emailIntro;
    els.supportEmailInput.value = content.supportEmail;
    els.staffNotificationEmailInput.value = content.staffNotificationEmail;
    els.businessAddressInput.value = content.businessAddress;
    els.serviceAreaInput.value = content.serviceArea;
    els.responseTimeCopyInput.value = content.responseTimeCopy;
    els.emergencyDisclaimerInput.value = content.emergencyDisclaimer;
    els.textChatStartedMessageInput.value = content.textChatStartedMessage;
    els.textChatWaitingMessageInput.value = content.textChatWaitingMessage;
    els.bookingConfirmationSubjectInput.value = content.bookingConfirmationSubject;
    els.textChatConfirmationSubjectInput.value = content.textChatConfirmationSubject;
    els.geminiEndpointInput.value = content.geminiEndpoint;
    els.geminiModelInput.value = content.geminiModel;
    els.adsClientInput.value = content.adsClient;
    els.adsSlotInput.value = content.adsSlot;
    els.adSlotTopBannerInput.value = content.adSlots.topBanner || "";
    els.adSlotLeftTopInput.value = content.adSlots.leftTop || "";
    els.adSlotLeftUpperInput.value = content.adSlots.leftUpper || "";
    els.adSlotLeftMiddleInput.value = content.adSlots.leftMiddle || "";
    els.adSlotLeftLowerInput.value = content.adSlots.leftLower || "";
    els.adSlotLeftBottomInput.value = content.adSlots.leftBottom || "";
    els.adSlotRightTopInput.value = content.adSlots.rightTop || "";
    els.adSlotRightUpperInput.value = content.adSlots.rightUpper || "";
    els.adSlotRightMiddleInput.value = content.adSlots.rightMiddle || "";
    els.adSlotRightLowerInput.value = content.adSlots.rightLower || "";
    els.adSlotRightBottomInput.value = content.adSlots.rightBottom || "";
    els.adSlotInlineOneInput.value = content.adSlots.inlineOne || "";
    els.adSlotInlineTwoInput.value = content.adSlots.inlineTwo || "";
    els.adSlotMobileChatInput.value = content.adSlots.mobileChat || "";
    els.adSlotBottomBannerInput.value = content.adSlots.bottomBanner || "";
    els.checkoutUrlInput.value = content.checkoutUrl;
    els.jitsiDomainInput.value = content.jitsiDomain;
    els.videoRateUsdInput.value = content.videoRateUsd;
    els.voiceRateUsdInput.value = content.voiceRateUsd;
    els.minimumCallMinutesInput.value = content.minimumCallMinutes;
    els.maximumCallMinutesInput.value = content.maximumCallMinutes;
    els.durationOptionsInput.value = content.durationOptions;
    els.refundPolicySummaryInput.value = content.refundPolicySummary;
    els.consentEnabledInput.value = String(Boolean(content.consentEnabled));
    els.consentTitleInput.value = content.consentTitle;
    els.consentBodyInput.value = content.consentBody;
    els.consentAcceptTextInput.value = content.consentAcceptText;
    els.consentRejectTextInput.value = content.consentRejectText;
    els.termsTextInput.value = content.termsText;
    els.privacyTextInput.value = content.privacyText;
    els.cookieTextInput.value = content.cookieText;
    els.refundTextInput.value = content.refundText;
    els.disclaimerTextInput.value = content.disclaimerText;
  }

  function sanitizeSiteContent(value) {
    const merged = { ...DEFAULT_SITE_CONTENT, ...(value || {}) };
    return {
      assistantName: cleanText(merged.assistantName, DEFAULT_SITE_CONTENT.assistantName),
      assistantAvatarText: cleanText(merged.assistantAvatarText, DEFAULT_SITE_CONTENT.assistantAvatarText).slice(0, 3),
      welcomeMessage: /diagnostic intake assistant/i.test(String(merged.welcomeMessage || ""))
        ? DEFAULT_SITE_CONTENT.welcomeMessage
        : cleanText(merged.welcomeMessage, DEFAULT_SITE_CONTENT.welcomeMessage),
      typingMessage: cleanText(merged.typingMessage, DEFAULT_SITE_CONTENT.typingMessage),
      systemPrompt: /intake LLM before a live technician handoff|live technician can continue/i.test(String(merged.systemPrompt || ""))
        ? DEFAULT_SITE_CONTENT.systemPrompt
        : cleanText(merged.systemPrompt, DEFAULT_SITE_CONTENT.systemPrompt),
      autonomousMode: merged.autonomousMode !== false && merged.autonomousMode !== "false",
      escalationPolicy: cleanText(merged.escalationPolicy, DEFAULT_SITE_CONTENT.escalationPolicy),
      escalationCustomerMessage: cleanText(merged.escalationCustomerMessage, DEFAULT_SITE_CONTENT.escalationCustomerMessage),
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
      supportEmail: cleanEmail(merged.supportEmail, DEFAULT_SITE_CONTENT.supportEmail),
      staffNotificationEmail: cleanEmail(merged.staffNotificationEmail, DEFAULT_SITE_CONTENT.staffNotificationEmail),
      businessAddress: cleanText(merged.businessAddress, DEFAULT_SITE_CONTENT.businessAddress),
      serviceArea: cleanText(merged.serviceArea, DEFAULT_SITE_CONTENT.serviceArea),
      responseTimeCopy: cleanText(merged.responseTimeCopy, DEFAULT_SITE_CONTENT.responseTimeCopy),
      emergencyDisclaimer: cleanText(merged.emergencyDisclaimer, DEFAULT_SITE_CONTENT.emergencyDisclaimer),
      textChatStartedMessage: cleanText(merged.textChatStartedMessage, DEFAULT_SITE_CONTENT.textChatStartedMessage),
      textChatWaitingMessage: cleanText(merged.textChatWaitingMessage, DEFAULT_SITE_CONTENT.textChatWaitingMessage),
      bookingConfirmationSubject: cleanText(merged.bookingConfirmationSubject, DEFAULT_SITE_CONTENT.bookingConfirmationSubject),
      textChatConfirmationSubject: cleanText(merged.textChatConfirmationSubject, DEFAULT_SITE_CONTENT.textChatConfirmationSubject),
      geminiEndpoint: cleanEndpoint(merged.geminiEndpoint, DEFAULT_SETTINGS.geminiEndpoint),
      geminiModel: cleanText(merged.geminiModel, DEFAULT_SETTINGS.geminiModel),
      adsClient: cleanAdsClient(merged.adsClient),
      adsSlot: cleanAdSlot(merged.adsSlot),
      adSlots: cleanAdSlots(merged.adSlots),
      checkoutUrl: cleanOptionalUrl(merged.checkoutUrl),
      jitsiDomain: cleanDomain(merged.jitsiDomain, DEFAULT_SETTINGS.jitsiDomain),
      videoRateUsd: cleanMoneyNumber(merged.videoRateUsd, DEFAULT_SITE_CONTENT.videoRateUsd),
      voiceRateUsd: cleanMoneyNumber(merged.voiceRateUsd, DEFAULT_SITE_CONTENT.voiceRateUsd),
      minimumCallMinutes: cleanMinuteNumber(merged.minimumCallMinutes, DEFAULT_SITE_CONTENT.minimumCallMinutes),
      maximumCallMinutes: cleanMinuteNumber(merged.maximumCallMinutes, DEFAULT_SITE_CONTENT.maximumCallMinutes),
      durationOptions: cleanDurationOptions(merged.durationOptions, DEFAULT_SITE_CONTENT.durationOptions),
      refundPolicySummary: cleanText(merged.refundPolicySummary, DEFAULT_SITE_CONTENT.refundPolicySummary),
      consentEnabled: merged.consentEnabled !== false && merged.consentEnabled !== "false",
      consentTitle: cleanText(merged.consentTitle, DEFAULT_SITE_CONTENT.consentTitle),
      consentBody: cleanText(merged.consentBody, DEFAULT_SITE_CONTENT.consentBody),
      consentAcceptText: cleanText(merged.consentAcceptText, DEFAULT_SITE_CONTENT.consentAcceptText),
      consentRejectText: cleanText(merged.consentRejectText, DEFAULT_SITE_CONTENT.consentRejectText),
      termsText: cleanText(merged.termsText, DEFAULT_SITE_CONTENT.termsText),
      privacyText: cleanText(merged.privacyText, DEFAULT_SITE_CONTENT.privacyText),
      cookieText: cleanText(merged.cookieText, DEFAULT_SITE_CONTENT.cookieText),
      refundText: cleanText(merged.refundText, DEFAULT_SITE_CONTENT.refundText),
      disclaimerText: cleanText(merged.disclaimerText, DEFAULT_SITE_CONTENT.disclaimerText),
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

  function cleanMoneyNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.round(number) : fallback;
  }

  function cleanMinuteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 5 ? Math.round(number) : fallback;
  }

  function cleanDurationOptions(value, fallback) {
    const options = String(value || "")
      .split(",")
      .map((item) => Math.round(Number(item.trim())))
      .filter((number) => Number.isFinite(number) && number >= 5 && number <= 480);
    const unique = Array.from(new Set(options)).sort((a, b) => a - b);
    return unique.length ? unique.join(",") : fallback;
  }

  function cleanAdsClient(value) {
    const text = cleanOptionalText(value);
    const match = text.match(/(?:ca-)?pub-\d{8,}/i);
    if (!match) return "";
    const client = match[0].toLowerCase();
    return client.startsWith("ca-") ? client : `ca-${client}`;
  }

  function cleanAdSlot(value) {
    const text = cleanOptionalText(value);
    const slotFromSnippet = text.match(/data-ad-slot=["']?(\d{5,})/i);
    if (slotFromSnippet) return slotFromSnippet[1];
    const firstNumber = text.match(/\b\d{5,}\b/);
    return firstNumber ? firstNumber[0] : "";
  }

  function cleanAdSlots(value) {
    const slots = value && typeof value === "object" ? value : {};
    return {
      topBanner: cleanAdSlot(slots.topBanner),
      leftTop: cleanAdSlot(slots.leftTop),
      leftUpper: cleanAdSlot(slots.leftUpper),
      leftMiddle: cleanAdSlot(slots.leftMiddle),
      leftLower: cleanAdSlot(slots.leftLower),
      leftBottom: cleanAdSlot(slots.leftBottom),
      rightTop: cleanAdSlot(slots.rightTop),
      rightUpper: cleanAdSlot(slots.rightUpper),
      rightMiddle: cleanAdSlot(slots.rightMiddle),
      rightLower: cleanAdSlot(slots.rightLower),
      rightBottom: cleanAdSlot(slots.rightBottom),
      inlineOne: cleanAdSlot(slots.inlineOne),
      inlineTwo: cleanAdSlot(slots.inlineTwo),
      mobileChat: cleanAdSlot(slots.mobileChat),
      bottomBanner: cleanAdSlot(slots.bottomBanner),
    };
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
    if (text.startsWith("/")) return text;
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

  function renderReadyCaseTable(rows, mechanicRows = []) {
    if (!rows.length) {
      els.adminReadyCases.innerHTML = `<div class="empty-state">No cases currently need human review.</div>`;
      return;
    }
    els.adminReadyCases.innerHTML = rows.map((row) => renderCaseRow(row, true, mechanicRows)).join("");
  }

  function renderConversationTable(rows, mechanicRows = []) {
    if (!rows.length) {
      els.adminConversations.innerHTML = `<div class="empty-state">No conversations yet.</div>`;
      return;
    }
    els.adminConversations.innerHTML = rows.map((row) => renderCaseRow(row, false, mechanicRows)).join("");
  }

  function renderCaseRow(row, readyList, mechanicRows = []) {
    const vehicle = row.vehicle || {};
    const messages = Array.isArray(row.messages) ? row.messages : [];
    const vehicleText = [vehicle.year, vehicle.make, vehicle.model, vehicle.mileage ? `(${vehicle.mileage})` : ""].filter(Boolean).join(" ") || "Unknown vehicle";
    const lastCustomerNote = [...messages].reverse().find((message) => message.role === "user")?.content || "No customer note captured.";
    const status = row.status || (isReadyCase(row) ? "waiting_for_mechanic" : "ai_intake");
    const priority = row.priority || "normal";
    const assignedMechanicId = row.assigned_mechanic_id || "";
    const statusLabel = statusLabelFor(status);
    const brief = cleanText(row.brief, "");
    const summaryClass = readyList ? "admin-row case-ready" : "admin-row";
    return `
      <details class="${summaryClass}">
        <summary>
          <span>
            <strong>${escapeHtml(row.title || "Mechanic case")}</strong>
            <small>${escapeHtml(statusLabel)} - ${escapeHtml(vehicleText)} - ${formatDate(row.updated_at)}</small>
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
        <form class="case-workflow-form" data-conversation-id="${escapeAttr(row.id)}">
          <label>
            <span>Status</span>
            <select name="status">
              ${workflowOption("ai_intake", "AI diagnosing", status)}
              ${workflowOption("waiting_for_mechanic", "Needs human review", status)}
              ${workflowOption("assigned", "Assigned", status)}
              ${workflowOption("answered", "Answered", status)}
              ${workflowOption("closed", "Closed", status)}
            </select>
          </label>
          <label>
            <span>Priority</span>
            <select name="priority">
              ${workflowOption("low", "Low", priority)}
              ${workflowOption("normal", "Normal", priority)}
              ${workflowOption("urgent", "Urgent", priority)}
            </select>
          </label>
          <label>
            <span>Assigned reviewer</span>
            <select name="assigned_mechanic_id">
              <option value="">Unassigned</option>
              ${mechanicRows.map((profile) => workflowOption(profile.id, staffLabel(profile), assignedMechanicId)).join("")}
            </select>
          </label>
          <button class="secondary-button" type="submit">
            <i data-lucide="clipboard-check"></i>
            <span>Update case</span>
          </button>
        </form>
        ${brief ? `<div class="case-brief"><strong>Private technician brief</strong><pre>${escapeHtml(brief)}</pre></div>` : ""}
        <div class="case-transcript">
          ${messages.map(renderMessageLine).join("") || `<div class="empty-state">No transcript yet.</div>`}
        </div>
        <form class="technician-reply-form" data-conversation-id="${escapeAttr(row.id)}">
          <label>
            <span>Human review reply</span>
            <textarea name="reply" rows="3" placeholder="Reply only when this exception needs your judgment..."></textarea>
          </label>
          <button class="solid-button" type="submit">
            <i data-lucide="send-horizontal"></i>
            <span>Send reply</span>
          </button>
        </form>
      </details>
    `;
  }

  function workflowOption(value, label, selectedValue) {
    const selected = String(value) === String(selectedValue) ? " selected" : "";
    return `<option value="${escapeAttr(value)}"${selected}>${escapeHtml(label)}</option>`;
  }

  function statusLabelFor(value) {
    const labels = {
      ai_intake: "AI collecting details",
      waiting_for_mechanic: "Needs human review",
      assigned: "Assigned",
      answered: "Answered",
      closed: "Closed",
    };
    return labels[value] || "AI collecting details";
  }

  function staffLabel(profile) {
    const name = profile.display_name || profile.email || "Technician";
    const title = profile.mechanic_title ? `, ${profile.mechanic_title}` : "";
    return `${name}${title}`;
  }

  function renderUserTable(rows) {
    if (!els.adminUsers) return;
    if (!rows.length) {
      els.adminUsers.innerHTML = `<div class="empty-state">No Supabase profiles yet.</div>`;
      return;
    }

    els.adminUsers.innerHTML = rows
      .map((profile) => {
        const role = profile.role || "customer";
        const availability = profile.availability_status || "offline";
        return `
          <form class="admin-row user-role-form" data-profile-id="${escapeAttr(profile.id)}">
            <span>
              <strong>${escapeHtml(profile.email || "No email")}</strong>
              <small>${escapeHtml(profile.id)}</small>
            </span>
            <label>
              <span class="visually-hidden">Display name</span>
              <input name="display_name" type="text" value="${escapeAttr(profile.display_name || "")}" placeholder="Display name" />
            </label>
            <label>
              <span class="visually-hidden">Role</span>
              <select name="role">
                ${workflowOption("customer", "Customer", role)}
                ${workflowOption("mechanic", "Mechanic", role)}
                ${workflowOption("admin", "Admin", role)}
              </select>
            </label>
            <label>
              <span class="visually-hidden">Availability</span>
              <select name="availability_status">
                ${workflowOption("offline", "Offline", availability)}
                ${workflowOption("available", "Available", availability)}
                ${workflowOption("busy", "Busy", availability)}
              </select>
            </label>
            <label>
              <span class="visually-hidden">Mechanic title</span>
              <input name="mechanic_title" type="text" value="${escapeAttr(profile.mechanic_title || "")}" placeholder="Mechanic title" />
            </label>
            <button class="secondary-button" type="submit">
              <i data-lucide="save"></i>
              <span>Save</span>
            </button>
          </form>
        `;
      })
      .join("");
  }

  function bindCaseWorkflowForms() {
    Array.from(document.querySelectorAll(".case-workflow-form")).forEach((form) => {
      form.addEventListener("submit", handleCaseWorkflowSave);
    });
  }

  function bindUserRoleForms() {
    Array.from(document.querySelectorAll(".user-role-form")).forEach((form) => {
      form.addEventListener("submit", handleUserRoleSave);
    });
  }

  async function handleCaseWorkflowSave(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const conversationId = form.dataset.conversationId;
    if (!conversationId || !state.supabase || state.profile?.role !== "admin") return;

    const status = form.elements.status.value;
    const priority = form.elements.priority.value;
    const assignedMechanicId = form.elements.assigned_mechanic_id.value || null;
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      const updates = {
        status,
        priority,
        assigned_mechanic_id: assignedMechanicId,
        updated_at: new Date().toISOString(),
        closed_at: status === "closed" ? new Date().toISOString() : null,
      };
      const { error } = await state.supabase.from("conversations").update(updates).eq("id", conversationId);
      if (error) throw error;
      await logAdminAction("case_workflow_updated", "conversation", conversationId, updates);
      await loadDashboard();
    } catch (error) {
      reportFormError(form, error.message || "Could not update case.");
    } finally {
      button.disabled = false;
    }
  }

  async function handleUserRoleSave(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const profileId = form.dataset.profileId;
    if (!profileId || !state.supabase || state.profile?.role !== "admin") return;

    const button = form.querySelector("button");
    button.disabled = true;
    const updates = {
      display_name: cleanOptionalText(form.elements.display_name.value).slice(0, 120) || null,
      role: form.elements.role.value,
      availability_status: form.elements.availability_status.value,
      mechanic_title: cleanOptionalText(form.elements.mechanic_title.value).slice(0, 120) || null,
      updated_at: new Date().toISOString(),
    };
    try {
      const { error } = await state.supabase.from("profiles").update(updates).eq("id", profileId);
      if (error) throw error;
      await logAdminAction("profile_updated", "profile", profileId, updates);
      await loadDashboard();
    } catch (error) {
      reportFormError(form, error.message || "Could not update user.");
    } finally {
      button.disabled = false;
    }
  }

  function reportFormError(form, message) {
    const control = form.querySelector("input, textarea, select, button");
    if (!control || typeof control.setCustomValidity !== "function") return;
    control.setCustomValidity(message);
    control.reportValidity();
    window.setTimeout(() => control.setCustomValidity(""), 3000);
  }

  function renderMessageLine(message) {
    const role = message.role === "user" ? "Customer" : message.technicianReply ? "Technician" : "AI";
    const flags = [message.handoff ? "handoff" : "", message.alert ? "safety" : ""].filter(Boolean).join(", ");
    return `
      <article class="transcript-line ${message.role === "user" ? "customer" : message.technicianReply ? "technician" : "assistant"}">
        <strong>${escapeHtml(role)}${flags ? ` - ${escapeHtml(flags)}` : ""}</strong>
        <p>${escapeHtml(message.content || "")}</p>
        <span>${formatDate(message.createdAt || message.created_at)}</span>
      </article>
    `;
  }

  function isReadyCase(row) {
    const messages = Array.isArray(row.messages) ? row.messages : [];
    return Boolean(
      ["waiting_for_mechanic", "assigned"].includes(row.status) ||
        messages.some((message) => message.escalationRequired === true) ||
        messages.some((message) => message.handoff === true)
    );
  }

  function isHumanReviewCase(diagnosticCase) {
    return ["waiting_for_mechanic", "assigned"].includes(diagnosticCase.status);
  }

  function bindTechnicianReplyForms() {
    Array.from(document.querySelectorAll(".technician-reply-form")).forEach((form) => {
      form.addEventListener("submit", handleTechnicianReply);
    });
  }

  async function handleTechnicianReply(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const conversationId = form.dataset.conversationId;
    const textarea = form.querySelector("textarea[name='reply']");
    const content = textarea.value.trim();
    if (!conversationId || !content || !state.supabase || state.profile?.role !== "admin") return;

    const button = form.querySelector("button");
    button.disabled = true;
    try {
      const { data, error } = await state.supabase
        .from("conversations")
        .select("messages")
        .eq("id", conversationId)
        .maybeSingle();
      if (error) throw error;
      const messages = Array.isArray(data?.messages) ? data.messages : [];
      const reply = {
        role: "assistant",
        name: state.siteContent.technicianName || "Technician",
        content,
        createdAt: new Date().toISOString(),
        handoff: true,
        technicianReply: true,
        technicianText: true,
      };
      const { error: updateError } = await state.supabase
        .from("conversations")
        .update({
          messages: [...messages, reply],
          status: "answered",
          assigned_mechanic_id: state.user.id,
          last_staff_message_at: reply.createdAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
      if (updateError) throw updateError;
      await logAdminAction("technician_reply_sent", "conversation", conversationId, {
        repliedAt: reply.createdAt,
      });
      textarea.value = "";
      await loadDashboard();
    } catch (error) {
      textarea.setCustomValidity(error.message || "Could not send reply.");
      textarea.reportValidity();
      window.setTimeout(() => textarea.setCustomValidity(""), 3000);
    } finally {
      button.disabled = false;
    }
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
        (row) => {
          const isText = row.call_type === "text";
          return `
            <div class="admin-row booking-row">
              <strong>${escapeHtml(isText ? "Free text chat" : `${capitalize(row.call_type || "call")} call`)}</strong>
              <span>${escapeHtml(isText ? "No charge" : `${row.duration_minutes || 0} min - $${row.total_usd || 0}`)}</span>
              <span>${escapeHtml([row.customer_email || row.owner_id || "Customer", row.scheduled_start_at ? formatDate(row.scheduled_start_at) : formatDate(row.created_at)].filter(Boolean).join(" - "))}</span>
              <span>${escapeHtml(row.status || "pending")}${row.meeting_url ? ` - ` : ""}${row.meeting_url ? `<a href="${escapeAttr(row.meeting_url)}" target="_blank" rel="noopener">room</a>` : ""}</span>
            </div>
          `;
        }
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

  function formatLabel(value) {
    return String(value || "")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatNumber(value) {
    return new Intl.NumberFormat().format(Number(value || 0));
  }

  function formatFileSize(value) {
    const bytes = Number(value || 0);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function commaList(value) {
    return Array.from(
      new Set(
        String(value || "")
          .split(/[,;]+/)
          .map((item) => item.trim())
          .filter(Boolean)
      )
    );
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }

  async function logAdminAction(action, targetType, targetId, metadata = {}) {
    if (!state.supabase || !state.user || state.profile?.role !== "admin") return;
    try {
      await state.supabase.from("admin_audit_logs").insert({
        actor_id: state.user.id,
        action,
        target_table: targetType,
        target_id: isUuid(targetId) ? targetId : null,
        metadata: {
          targetRef: String(targetId || ""),
          ...metadata,
        },
      });
    } catch (error) {
      // Audit logging is helpful but should not block the admin workflow.
    }
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
  }

  function createIcons() {
    if (window.lucide) window.lucide.createIcons();
  }
})();
