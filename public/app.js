(function () {
  const STORAGE = {
    settings: "wrenchline.settings",
    conversations: "wrenchline.conversations",
    siteContent: "wrenchline.siteContent",
    session: "wrenchline.session",
  };

  const BOOT_CONFIG = window.WRENCHLINE_CONFIG || {};
  const DEFAULT_SETTINGS = {
    supabaseUrl: "",
    supabaseAnonKey: "",
    geminiEndpoint: "",
    geminiApiKey: "",
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
    systemPrompt: [
      "You are Gemini Diagnostic AI for WrenchLine Auto Helpdesk.",
      "You are the intake LLM before a live technician handoff.",
      "Ask one concise diagnostic question at a time unless the driver has already provided enough information.",
      "Prioritize year, make, model, engine, mileage, warning lights, OBD-II codes, noises, leaks, smells, recent work, and when the symptom appears.",
      "Flag urgent safety conditions like overheating, brake loss, smoke, fuel smell, or oil pressure warnings.",
      "When enough details are collected, summarize the case and say it is ready for a technician handoff.",
      "Do not claim to replace an in-person mechanic.",
    ].join(" "),
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

  const MAKE_WORDS = [
    "acura",
    "audi",
    "bmw",
    "buick",
    "cadillac",
    "chevrolet",
    "chevy",
    "chrysler",
    "dodge",
    "ford",
    "gmc",
    "honda",
    "hyundai",
    "infiniti",
    "jeep",
    "kia",
    "lexus",
    "mazda",
    "mercedes",
    "nissan",
    "ram",
    "subaru",
    "tesla",
    "toyota",
    "volkswagen",
    "volvo",
  ];

  const els = {};
  const state = {
    settings: loadSettings(),
    siteContent: { ...DEFAULT_SITE_CONTENT },
    conversations: [],
    activeId: "",
    vehicle: {},
    callType: "video",
    supabase: null,
    supabaseUser: null,
    authSubscription: null,
    authMode: "login",
    saving: false,
    typing: false,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  async function init() {
    cacheElements();
    bindEvents();
    loadLocalConversations();
    if (!state.conversations.length) {
      createConversation(false);
    } else {
      state.activeId = state.conversations[0].id;
      state.vehicle = { ...(currentConversation()?.vehicle || {}) };
    }
    fillSettingsForm();
    renderAll();
    await connectSupabase();
    await loadSiteContent();
    await loadSupabaseConversations();
    renderAll();
    renderAds();
    createIcons();
  }

  function cacheElements() {
    [
      "accountBadge",
      "loginNavBtn",
      "signupNavBtn",
      "logoutBtn",
      "settingsBtn",
      "newConversationBtn",
      "savedCasesToggle",
      "savedDrawer",
      "refreshConversationsBtn",
      "conversationList",
      "messages",
      "messageInput",
      "chatForm",
      "briefBtn",
      "clearCaseBtn",
      "vehicleDetails",
      "durationSelect",
      "bookingPrice",
      "bookingBtn",
      "bookingResult",
      "technicianAvatar",
      "technicianNameTitle",
      "technicianStats",
      "technicianExperience",
      "onlineCopy",
      "authDialog",
      "authForm",
      "authTitle",
      "authEmailInput",
      "authPasswordInput",
      "authMessage",
      "authSubmitBtn",
      "switchAuthModeBtn",
      "closeAuthBtn",
      "settingsDialog",
      "settingsForm",
      "resetSettingsBtn",
      "integrationStatus",
      "supabaseUrlInput",
      "supabaseAnonInput",
      "geminiEndpointInput",
      "geminiKeyInput",
      "geminiModelInput",
      "adsClientInput",
      "adsSlotInput",
      "checkoutUrlInput",
      "jitsiDomainInput",
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
    els.callOptions = Array.from(document.querySelectorAll("[data-call-type]"));
    els.quickPrompts = Array.from(document.querySelectorAll("[data-prompt]"));
    els.adMounts = Array.from(document.querySelectorAll(".ad-mount"));
  }

  function bindEvents() {
    els.savedCasesToggle.addEventListener("click", () => {
      els.savedDrawer.hidden = !els.savedDrawer.hidden;
      renderConversations();
    });
    els.newConversationBtn.addEventListener("click", () => createConversation(true));
    els.refreshConversationsBtn.addEventListener("click", async () => {
      await loadSupabaseConversations();
      renderAll();
    });
    els.loginNavBtn.addEventListener("click", () => openAuth("login"));
    els.signupNavBtn.addEventListener("click", () => openAuth("signup"));
    els.closeAuthBtn.addEventListener("click", () => els.authDialog.close());
    els.switchAuthModeBtn.addEventListener("click", () => setAuthMode(state.authMode === "login" ? "signup" : "login"));
    els.authForm.addEventListener("submit", handleAuthSubmit);
    els.logoutBtn.addEventListener("click", signOut);

    els.settingsBtn.addEventListener("click", () => {
      fillSettingsForm();
      els.settingsDialog.showModal();
      createIcons();
    });
    els.settingsForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (event.submitter?.value === "cancel") {
        els.settingsDialog.close();
        return;
      }
      saveSettingsFromForm();
      els.settingsDialog.close();
      await connectSupabase(true);
      await loadSiteContent();
      await loadSupabaseConversations();
      renderAds();
      renderAll();
    });
    els.resetSettingsBtn.addEventListener("click", async () => {
      state.settings = { ...DEFAULT_SETTINGS };
      localStorage.removeItem(STORAGE.settings);
      fillSettingsForm();
      await connectSupabase(true);
      renderAds();
      renderAll();
    });

    els.chatForm.addEventListener("submit", handleSend);
    els.quickPrompts.forEach((button) => {
      button.addEventListener("click", () => {
        els.messageInput.value = button.dataset.prompt;
        els.messageInput.focus();
      });
    });
    els.briefBtn.addEventListener("click", createBrief);
    els.clearCaseBtn.addEventListener("click", clearCurrentCase);
    els.callOptions.forEach((button) => {
      button.addEventListener("click", () => {
        state.callType = button.dataset.callType;
        renderBooking();
      });
    });
    els.durationSelect.addEventListener("change", renderBooking);
    els.bookingBtn.addEventListener("click", reserveMechanic);
  }

  function createConversation(makeActive) {
    const id = newId();
    const createdAt = new Date().toISOString();
    const conversation = {
      id,
      title: "New mechanic case",
      vehicle: {},
      messages: [
        {
          role: "assistant",
          name: assistantName(),
          content: state.siteContent.welcomeMessage,
          createdAt,
        },
      ],
      brief: "",
      createdAt,
      updatedAt: createdAt,
      source: "local",
    };
    state.conversations.unshift(conversation);
    if (makeActive || !state.activeId) {
      state.activeId = id;
      state.vehicle = {};
    }
    persistLocal();
    renderAll();
  }

  async function handleSend(event) {
    event.preventDefault();
    const text = els.messageInput.value.trim();
    if (!text || state.typing) return;
    els.messageInput.value = "";
    await addMessage("user", text, { name: "You" });
    inferVehicle(text);
    renderVehicleDetails();
    await respondToUser(text);
  }

  async function addMessage(role, content, meta = {}) {
    const conversation = currentConversation();
    if (!conversation) return;
    conversation.messages.push({
      role,
      content,
      createdAt: new Date().toISOString(),
      ...meta,
    });
    if (role === "user" && conversation.title === "New mechanic case") {
      conversation.title = titleFromText(content);
    }
    conversation.vehicle = { ...state.vehicle };
    conversation.updatedAt = new Date().toISOString();
    persistLocal();
    renderAll();
    await saveCurrentConversation();
  }

  async function respondToUser(latestUserText) {
    state.typing = true;
    renderMessages();
    try {
      const text = await getGeminiReply();
      await addMessage("assistant", text || localDiagnosticReply(latestUserText), {
        name: assistantName(),
        ...classifyReply(text),
      });
    } catch (error) {
      const fallback = localDiagnosticReply(latestUserText);
      await addMessage("assistant", fallback, {
        name: assistantName(),
        ...classifyReply(fallback),
      });
    } finally {
      state.typing = false;
      renderMessages();
    }
  }

  async function getGeminiReply() {
    const conversation = currentConversation();
    if (!conversation) return "";
    if (state.settings.geminiEndpoint) {
      const response = await fetch(state.settings.geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversation.messages,
          vehicle: state.vehicle,
          brief: conversation.brief,
          siteContent: state.siteContent,
          systemPrompt: mechanicSystemPrompt(),
        }),
      });
      if (!response.ok) throw new Error("Gemini endpoint failed");
      const data = await response.json();
      return data.text || data.reply || "";
    }

    if (!state.settings.geminiApiKey) return "";

    const contents = conversation.messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .slice(-12)
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      }));

    const model = encodeURIComponent(state.settings.geminiModel || DEFAULT_SETTINGS.geminiModel);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        state.settings.geminiApiKey
      )}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: mechanicSystemPrompt() }] },
          contents,
          generationConfig: { temperature: 0.45, maxOutputTokens: 360 },
        }),
      }
    );
    if (!response.ok) throw new Error("Gemini API failed");
    const data = await response.json();
    return (
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim() || ""
    );
  }

  function mechanicSystemPrompt() {
    return state.siteContent.systemPrompt || DEFAULT_SITE_CONTENT.systemPrompt;
  }

  function assistantName() {
    return state.siteContent.assistantName || DEFAULT_SITE_CONTENT.assistantName;
  }

  function assistantAvatarText() {
    return (state.siteContent.assistantAvatarText || DEFAULT_SITE_CONTENT.assistantAvatarText).slice(0, 3);
  }

  function localDiagnosticReply(latestUserText) {
    const conversation = currentConversation();
    const allText = `${conversation?.messages.map((message) => message.content).join(" ")} ${latestUserText}`.toLowerCase();
    const urgent = urgentSafetyLine(allText);
    const userMessages = conversation?.messages.filter((message) => message.role === "user") || [];

    const missingVehicle = !state.vehicle.year || !state.vehicle.make || !state.vehicle.model;
    const hasMileage = /\b\d{2,3}[,.]?\d{3}\s*(miles|mi|km|kilometers)?\b/i.test(allText);
    const hasCodes = /\bp0\d{3}\b|\bp1\d{3}\b|\bobd\b|code/i.test(allText);
    const hasTiming = /\b(cold|hot|idle|accelerat|brak|turn|start|highway|stop|reverse|morning|after)\b/i.test(allText);
    const hasRecentWork = /\b(replaced|changed|repair|service|oil change|battery|alternator|brake job|spark plug)\b/i.test(allText);

    let question = "";
    if (missingVehicle) {
      question = "What year, make, model, engine size, and mileage are we working with?";
    } else if (!hasTiming) {
      question = "When does it happen most: cold start, warm idle, acceleration, braking, turning, highway speed, or after a longer drive?";
    } else if (!hasCodes && /\b(check engine|cel|warning|light|rough|misfire|stall|transmission)\b/i.test(allText)) {
      question = "Have you scanned it for OBD-II codes yet? If yes, send the exact codes, even pending ones.";
    } else if (!hasMileage) {
      question = "About how many miles are on the vehicle, and has this started suddenly or gradually?";
    } else if (!hasRecentWork) {
      question = "Has any recent maintenance or repair happened before this started, even something routine like a battery, oil, tire, or brake service?";
    } else if (userMessages.length < state.siteContent.handoffAfterMessages) {
      question = "What changed right before the symptom appeared: weather, fuel stop, pothole, long trip, warning light, or a specific sound or smell?";
    } else {
      return buildSummaryReply(urgent);
    }

    return [urgent, question].filter(Boolean).join("\n\n");
  }

  function urgentSafetyLine(text) {
    if (/\b(overheat|temperature|steam|coolant|red temp)\b/i.test(text)) {
      return "Safety note: if the temperature gauge is in the red, steam is visible, or coolant is leaking fast, shut the engine off and avoid driving it until it cools and the leak source is checked.";
    }
    if (/\b(brake pedal|no brakes|brake fluid|grinding brakes|soft pedal)\b/i.test(text)) {
      return "Safety note: brake loss, a soft pedal, or metal-on-metal grinding can become unsafe quickly. Avoid driving if stopping distance has changed.";
    }
    if (/\b(fuel smell|gas smell|smoke|burning oil|oil pressure)\b/i.test(text)) {
      return "Safety note: fuel smell, smoke, or an oil pressure warning should be treated as urgent. Stop driving if the warning is active or the smell is strong.";
    }
    return "";
  }

  function buildSummaryReply(urgent) {
    const brief = buildMechanicBrief();
    return [
      urgent,
      "Here is the working brief I’d hand to a mechanic:",
      brief,
      handoffMessage(),
      "A voice call is good for a quick diagnostic readout; choose video if you can show the sound, leak, belt movement, dash warnings, or under-hood area live.",
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  function classifyReply(text) {
    return {
      alert: Boolean(text && /Safety note:/i.test(text)),
      handoff: Boolean(text && /handoff|technician-ready|take over/i.test(text)),
    };
  }

  function handoffMessage() {
    return (state.siteContent.handoffMessage || DEFAULT_SITE_CONTENT.handoffMessage)
      .replaceAll("{technicianName}", state.siteContent.technicianName)
      .replaceAll("{technicianTitle}", state.siteContent.technicianTitle);
  }

  function inferVehicle(text) {
    const lower = text.toLowerCase();
    const year = text.match(/\b(19[8-9]\d|20[0-3]\d)\b/);
    const mileage = text.match(/\b(\d{2,3}[,.]?\d{3})\s*(miles|mi|km|kilometers)?\b/i);
    const make = MAKE_WORDS.find((word) => lower.includes(word));

    if (year) state.vehicle.year = year[1];
    if (make) state.vehicle.make = make === "chevy" ? "Chevrolet" : capitalize(make);
    if (mileage) state.vehicle.mileage = `${mileage[1].replace(",", "")} ${mileage[2] || "mi"}`;

    const modelGuess = modelAfterMake(text, make);
    if (modelGuess) state.vehicle.model = modelGuess;

    const issueTags = [];
    if (/\bcheck engine|cel|p0\d{3}|misfire\b/i.test(text)) issueTags.push("Engine");
    if (/\bbrake|rotor|pad|grind\b/i.test(text)) issueTags.push("Brakes");
    if (/\bstart|battery|alternator|starter\b/i.test(text)) issueTags.push("Starting");
    if (/\boverheat|coolant|radiator|temperature\b/i.test(text)) issueTags.push("Cooling");
    if (/\btransmission|shift|gear|clutch\b/i.test(text)) issueTags.push("Drivetrain");
    if (issueTags.length) {
      state.vehicle.category = Array.from(new Set([...(state.vehicle.category ? state.vehicle.category.split(", ") : []), ...issueTags])).join(", ");
    }
  }

  function modelAfterMake(text, make) {
    if (!make) return "";
    const pattern = new RegExp(`${make}\\s+([a-z0-9-]{2,}(?:\\s+[a-z0-9-]{2,})?)`, "i");
    const match = text.match(pattern);
    if (!match) return "";
    const stopWords = new Set(["with", "has", "had", "that", "and", "the", "is", "was", "miles", "mi", "km"]);
    return match[1]
      .split(/\s+/)
      .filter((word) => !stopWords.has(word.toLowerCase()))
      .slice(0, 2)
      .map(capitalize)
      .join(" ");
  }

  function createBrief() {
    const conversation = currentConversation();
    if (!conversation) return;
    conversation.brief = buildMechanicBrief();
    conversation.updatedAt = new Date().toISOString();
    persistLocal();
    saveCurrentConversation();
    addMessage("assistant", `Mechanic brief saved:\n\n${conversation.brief}`, {
      name: assistantName(),
    });
  }

  function buildMechanicBrief() {
    const conversation = currentConversation();
    const userNotes = (conversation?.messages || [])
      .filter((message) => message.role === "user")
      .slice(-6)
      .map((message) => `- ${message.content}`)
      .join("\n");
    const vehicle = [state.vehicle.year, state.vehicle.make, state.vehicle.model, state.vehicle.mileage ? `(${state.vehicle.mileage})` : ""]
      .filter(Boolean)
      .join(" ");

    return [
      `Vehicle: ${vehicle || "Not captured yet"}`,
      `Area: ${state.vehicle.category || "Needs diagnosis"}`,
      "Driver notes:",
      userNotes || "- No driver notes yet",
      "Priority checks: warning lights/codes, fluid leaks, recent maintenance, exact sound/smell, and whether the car is safe to drive.",
    ].join("\n");
  }

  function clearCurrentCase() {
    const conversation = currentConversation();
    if (!conversation) return;
    conversation.messages = conversation.messages.slice(0, 1);
    conversation.vehicle = {};
    conversation.brief = "";
    conversation.title = "New mechanic case";
    conversation.updatedAt = new Date().toISOString();
    state.vehicle = {};
    persistLocal();
    saveCurrentConversation();
    renderAll();
  }

  async function reserveMechanic() {
    if (state.supabase && !state.supabaseUser) {
      openAuth("login", "Log in before reserving a live mechanic call.");
      return;
    }

    const duration = Number(els.durationSelect.value);
    const rate = state.callType === "video" ? 40 : 20;
    const total = Math.round((rate * duration) / 60);
    const conversation = currentConversation();
    const payload = {
      callType: state.callType,
      durationMinutes: duration,
      hourlyRate: rate,
      totalUsd: total,
      conversationId: conversation?.id,
      title: conversation?.title || "Mechanic consultation",
      brief: conversation?.brief || buildMechanicBrief(),
    };

    els.bookingBtn.disabled = true;
    els.bookingResult.hidden = false;
    els.bookingResult.textContent = "Preparing checkout...";

    try {
      if (state.settings.checkoutUrl) {
        const response = await fetch(state.settings.checkoutUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error("Checkout function failed");
        const data = await response.json();
        if (data.url) {
          await saveBooking(payload, data.url, "checkout_started");
          window.location.href = data.url;
          return;
        }
      }
      await showDemoBooking(payload);
    } catch (error) {
      await showDemoBooking(payload);
    } finally {
      els.bookingBtn.disabled = false;
    }
  }

  async function showDemoBooking(payload) {
    const domain = (state.settings.jitsiDomain || DEFAULT_SETTINGS.jitsiDomain).replace(/^https?:\/\//, "");
    const roomName = `WrenchLine-${payload.callType}-${payload.conversationId || newId()}`.replace(/[^a-z0-9-]/gi, "");
    const jitsiUrl = `https://${domain}/${roomName}#config.startWithVideoMuted=${payload.callType === "voice"}`;
    els.bookingResult.innerHTML = `
      <strong>${capitalize(payload.callType)} session reserved.</strong><br>
      ${payload.durationMinutes} minutes at $${payload.hourlyRate}/hr: <strong>$${payload.totalUsd}.00</strong><br>
      <a href="${escapeAttr(jitsiUrl)}" target="_blank" rel="noopener">Open ${payload.callType} room</a>
    `;
    await saveBooking(payload, jitsiUrl, "reserved");
  }

  async function saveBooking(payload, meetingUrl, status) {
    if (!state.supabase || !state.supabaseUser) return;
    try {
      await state.supabase.from("call_bookings").insert({
        owner_id: state.supabaseUser.id,
        conversation_id: isUuid(payload.conversationId) ? payload.conversationId : null,
        call_type: payload.callType,
        duration_minutes: payload.durationMinutes,
        hourly_rate_usd: payload.hourlyRate,
        total_usd: payload.totalUsd,
        meeting_url: meetingUrl,
        status,
      });
    } catch (error) {
      // The booking still works in demo mode if the optional table is not present yet.
    }
  }

  async function connectSupabase(forceReset = false) {
    if (forceReset && state.authSubscription) {
      state.authSubscription.unsubscribe?.();
      state.authSubscription = null;
    }
    if (forceReset) {
      state.supabase = null;
      state.supabaseUser = null;
    }

    const { supabaseUrl, supabaseAnonKey } = state.settings;
    if (!supabaseUrl || !supabaseAnonKey || !window.supabase) {
      renderAuth();
      renderStatus();
      return;
    }

    try {
      state.supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
      await refreshSupabaseUser();
      const subscription = state.supabase.auth.onAuthStateChange(async (_event, session) => {
        state.supabaseUser = session?.user || null;
        renderAuth();
        if (state.supabaseUser) {
          await loadSupabaseConversations();
          renderAll();
        }
      });
      state.authSubscription = subscription.data?.subscription || null;
    } catch (error) {
      state.supabase = null;
      state.supabaseUser = null;
    }
    renderAuth();
    renderStatus();
  }

  async function loadSiteContent() {
    state.siteContent = { ...DEFAULT_SITE_CONTENT, ...loadLocalSiteContent() };
    if (!state.supabase) {
      renderTechnicianProfile();
      return;
    }

    try {
      const { data, error } = await state.supabase.from("site_settings").select("value").eq("key", "public_content").maybeSingle();
      if (error) throw error;
      if (data?.value && typeof data.value === "object") {
        state.siteContent = sanitizeSiteContent(data.value);
        localStorage.setItem(STORAGE.siteContent, JSON.stringify(state.siteContent));
      }
    } catch (error) {
      state.siteContent = { ...DEFAULT_SITE_CONTENT, ...loadLocalSiteContent() };
    }
    renderTechnicianProfile();
  }

  function loadLocalSiteContent() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE.siteContent) || "{}");
    } catch (error) {
      return {};
    }
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

  async function refreshSupabaseUser() {
    if (!state.supabase) return null;
    const { data } = await state.supabase.auth.getSession();
    state.supabaseUser = data?.session?.user || null;
    renderAuth();
    return state.supabaseUser;
  }

  function openAuth(mode, message = "") {
    setAuthMode(mode);
    els.authMessage.textContent = message;
    els.authDialog.showModal();
    createIcons();
  }

  function setAuthMode(mode) {
    state.authMode = mode;
    const isLogin = mode === "login";
    els.authTitle.textContent = isLogin ? "Login" : "Create account";
    els.authSubmitBtn.querySelector("span").textContent = isLogin ? "Login" : "Create account";
    els.switchAuthModeBtn.textContent = isLogin ? "Create account" : "Use existing login";
    els.authPasswordInput.autocomplete = isLogin ? "current-password" : "new-password";
    els.authMessage.textContent = "";
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    if (!state.supabase) {
      await connectSupabase();
    }
    if (!state.supabase) {
      els.authMessage.textContent = "Add Supabase URL and anon key in Integrations first.";
      return;
    }

    const email = els.authEmailInput.value.trim();
    const password = els.authPasswordInput.value;
    els.authSubmitBtn.disabled = true;
    els.authMessage.textContent = state.authMode === "login" ? "Logging in..." : "Creating account...";

    try {
      if (state.authMode === "login") {
        const { error } = await state.supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await refreshSupabaseUser();
        await loadSupabaseConversations();
        await saveCurrentConversation();
        els.authDialog.close();
      } else {
        const { data, error } = await state.supabase.auth.signUp({
          email,
          password,
          options: { data: { role: "customer" } },
        });
        if (error) throw error;
        if (data.session) {
          await refreshSupabaseUser();
          await saveCurrentConversation();
          els.authDialog.close();
        } else {
          els.authMessage.textContent = "Check your email to confirm the account, then log in.";
        }
      }
      renderAll();
    } catch (error) {
      els.authMessage.textContent = error.message || "Authentication failed.";
    } finally {
      els.authSubmitBtn.disabled = false;
    }
  }

  async function signOut() {
    if (state.supabase) {
      await state.supabase.auth.signOut();
    }
    state.supabaseUser = null;
    loadLocalConversations();
    if (!state.conversations.length) createConversation(false);
    state.activeId = state.conversations[0].id;
    state.vehicle = { ...(currentConversation()?.vehicle || {}) };
    renderAll();
  }

  async function loadSupabaseConversations() {
    if (!state.supabase || !state.supabaseUser) return;
    try {
      const { data, error } = await state.supabase
        .from("conversations")
        .select("id,title,vehicle,messages,brief,created_at,updated_at")
        .order("updated_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      if (Array.isArray(data) && data.length) {
        state.conversations = data.map(fromSupabaseRow);
        state.activeId = state.conversations[0].id;
        state.vehicle = { ...(state.conversations[0].vehicle || {}) };
        persistLocal();
      }
    } catch (error) {
      renderStatus();
    }
  }

  async function saveCurrentConversation() {
    const conversation = currentConversation();
    if (!conversation || state.saving) return;
    persistLocal();
    if (!state.supabase || !state.supabaseUser) return;
    state.saving = true;
    try {
      const payload = {
        owner_id: state.supabaseUser.id,
        session_id: getSessionId(),
        title: conversation.title,
        vehicle: conversation.vehicle || {},
        messages: conversation.messages || [],
        brief: conversation.brief || "",
        updated_at: new Date().toISOString(),
      };
      if (isUuid(conversation.id) && conversation.source === "supabase") {
        const { error } = await state.supabase.from("conversations").update(payload).eq("id", conversation.id);
        if (error) throw error;
      } else {
        const { data, error } = await state.supabase.from("conversations").insert(payload).select().single();
        if (error) throw error;
        const index = state.conversations.findIndex((item) => item.id === conversation.id);
        const remoteConversation = fromSupabaseRow(data);
        if (index >= 0) state.conversations[index] = remoteConversation;
        state.activeId = remoteConversation.id;
      }
      persistLocal();
      renderConversations();
    } catch (error) {
      renderStatus();
    } finally {
      state.saving = false;
    }
  }

  function fromSupabaseRow(row) {
    return {
      id: row.id,
      title: row.title || "Mechanic case",
      vehicle: row.vehicle || {},
      messages: Array.isArray(row.messages) ? row.messages : [],
      brief: row.brief || "",
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
      source: "supabase",
    };
  }

  function renderAll() {
    renderAuth();
    renderTechnicianProfile();
    renderConversations();
    renderMessages();
    renderVehicleDetails();
    renderBooking();
    renderStatus();
    createIcons();
  }

  function renderTechnicianProfile() {
    if (!els.technicianAvatar) return;
    const content = state.siteContent || DEFAULT_SITE_CONTENT;
    els.technicianAvatar.src = content.technicianAvatar || DEFAULT_SITE_CONTENT.technicianAvatar;
    els.technicianAvatar.alt = `${content.technicianName || "Technician"} profile`;
    els.technicianNameTitle.textContent = `${content.technicianName}, ${content.technicianTitle}`;
    els.technicianStats.textContent = content.technicianStats;
    els.technicianExperience.textContent = content.technicianExperience;
    if (els.onlineCopy) {
      els.onlineCopy.textContent = `${content.technicianName} is ready for live handoff`;
    }
  }

  function renderAuth() {
    const configured = Boolean(state.settings.supabaseUrl && state.settings.supabaseAnonKey);
    if (state.supabaseUser) {
      els.accountBadge.textContent = state.supabaseUser.email || "Logged in";
      els.loginNavBtn.hidden = true;
      els.signupNavBtn.hidden = true;
      els.logoutBtn.hidden = false;
    } else {
      els.accountBadge.textContent = configured ? "Supabase ready" : "Demo mode";
      els.loginNavBtn.hidden = false;
      els.signupNavBtn.hidden = false;
      els.logoutBtn.hidden = true;
    }
  }

  function renderConversations() {
    if (!state.conversations.length) {
      els.conversationList.innerHTML = `<div class="empty-state">No saved cases yet.</div>`;
      return;
    }
    els.conversationList.innerHTML = state.conversations
      .map((conversation) => {
        const active = conversation.id === state.activeId ? " active" : "";
        const count = conversation.messages.filter((message) => message.role === "user").length;
        return `
          <button class="conversation-item${active}" type="button" data-conversation-id="${escapeAttr(conversation.id)}">
            <span class="conversation-title">${escapeHtml(conversation.title)}</span>
            <span class="conversation-meta">${count} driver ${count === 1 ? "note" : "notes"} - ${relativeTime(conversation.updatedAt)}</span>
          </button>
        `;
      })
      .join("");

    Array.from(els.conversationList.querySelectorAll("[data-conversation-id]")).forEach((button) => {
      button.addEventListener("click", () => {
        state.activeId = button.dataset.conversationId;
        state.vehicle = { ...(currentConversation()?.vehicle || {}) };
        renderAll();
      });
    });
  }

  function renderMessages() {
    const conversation = currentConversation();
    const messages = conversation?.messages || [];
    els.messages.innerHTML = messages
      .map((message) => {
        const role = message.role === "user" ? "user" : "assistant";
        const alert = message.alert ? " alert" : "";
        const handoff = message.handoff ? " handoff" : "";
        const avatar = role === "user" ? "You" : assistantAvatarText();
        const name = message.name || (role === "user" ? "You" : assistantName());
        return `
          <article class="message ${role}${alert}${handoff}">
            <div class="avatar" aria-hidden="true">${escapeHtml(avatar)}</div>
            <div class="message-body">
              <div class="message-name">${escapeHtml(name)}</div>
              <div class="bubble">${escapeHtml(message.content)}</div>
              <div class="message-time">${formatTime(message.createdAt)}</div>
            </div>
          </article>
        `;
      })
      .join("");

    if (state.typing) {
      els.messages.insertAdjacentHTML(
        "beforeend",
        `<article class="message assistant typing"><div class="avatar" aria-hidden="true">${escapeHtml(assistantAvatarText())}</div><div class="message-body"><div class="message-name">${escapeHtml(assistantName())}</div><div class="bubble">${escapeHtml(state.siteContent.typingMessage)}</div></div></article>`
      );
    }
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  function renderVehicleDetails() {
    const details = [
      ["Year", state.vehicle.year || "Unknown"],
      ["Make", state.vehicle.make || "Unknown"],
      ["Model", state.vehicle.model || "Unknown"],
      ["Mileage", state.vehicle.mileage || "Unknown"],
      ["Area", state.vehicle.category || "Not tagged"],
      ["Brief", currentConversation()?.brief ? "Saved" : "Pending"],
    ];
    els.vehicleDetails.innerHTML = details
      .map(
        ([label, value]) => `
          <div class="vehicle-tile">
            <span class="vehicle-label">${escapeHtml(label)}</span>
            <span class="vehicle-value">${escapeHtml(value)}</span>
          </div>
        `
      )
      .join("");
  }

  function renderBooking() {
    els.callOptions.forEach((button) => {
      const active = button.dataset.callType === state.callType;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    const duration = Number(els.durationSelect.value || 60);
    const rate = state.callType === "video" ? 40 : 20;
    const total = (rate * duration) / 60;
    els.bookingPrice.textContent = `$${total.toFixed(2)}`;
  }

  function renderStatus() {
    const rows = [
      ["Supabase", Boolean(state.supabase && state.supabaseUser)],
      ["Gemini", Boolean(state.settings.geminiEndpoint || state.settings.geminiApiKey)],
      ["Ads", Boolean(state.settings.adsClient && state.settings.adsSlot)],
      ["Checkout", Boolean(state.settings.checkoutUrl)],
    ];
    els.integrationStatus.innerHTML = rows
      .map((row) => `<span class="status-pill">${row[0]} <b>${row[1] ? "Connected" : "Demo"}</b></span>`)
      .join("");
  }

  function renderAds() {
    const mounts = els.adMounts || [];
    if (!state.settings.adsClient || !state.settings.adsSlot) {
      mounts.forEach((mount) => {
        mount.innerHTML = "<span>Advertisement</span>";
      });
      return;
    }
    const scriptId = "adsbygoogle-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(state.settings.adsClient)}`;
      document.head.appendChild(script);
    }
    mounts.forEach((mount) => {
      mount.innerHTML = "";
      const ad = document.createElement("ins");
      ad.className = "adsbygoogle";
      ad.style.display = "block";
      ad.dataset.adClient = state.settings.adsClient;
      ad.dataset.adSlot = state.settings.adsSlot;
      ad.dataset.adFormat = "auto";
      ad.dataset.fullWidthResponsive = "true";
      mount.appendChild(ad);
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
      } catch (error) {
        mount.innerHTML = "<span>Advertisement</span>";
      }
    });
  }

  function loadLocalConversations() {
    try {
      state.conversations = JSON.parse(localStorage.getItem(STORAGE.conversations) || "[]");
      state.conversations.forEach((conversation) => {
        (conversation.messages || []).forEach((message) => {
          if (/chatbot/i.test(message.name || "")) {
            message.name = assistantName();
          }
          if (message.role === "assistant" && message.content === "Welcome! What's going on with your car?") {
            message.content = state.siteContent.welcomeMessage;
          }
        });
      });
    } catch (error) {
      state.conversations = [];
    }
  }

  function persistLocal() {
    localStorage.setItem(STORAGE.conversations, JSON.stringify(state.conversations.slice(0, 40)));
  }

  function loadSettings() {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(STORAGE.settings) || "{}") };
    } catch (error) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function fillSettingsForm() {
    els.supabaseUrlInput.value = state.settings.supabaseUrl || "";
    els.supabaseAnonInput.value = state.settings.supabaseAnonKey || "";
    els.geminiEndpointInput.value = state.settings.geminiEndpoint || "";
    els.geminiKeyInput.value = state.settings.geminiApiKey || "";
    els.geminiModelInput.value = state.settings.geminiModel || DEFAULT_SETTINGS.geminiModel;
    els.adsClientInput.value = state.settings.adsClient || "";
    els.adsSlotInput.value = state.settings.adsSlot || "";
    els.checkoutUrlInput.value = state.settings.checkoutUrl || "";
    els.jitsiDomainInput.value = state.settings.jitsiDomain || DEFAULT_SETTINGS.jitsiDomain;
  }

  function saveSettingsFromForm() {
    state.settings = {
      supabaseUrl: els.supabaseUrlInput.value.trim(),
      supabaseAnonKey: els.supabaseAnonInput.value.trim(),
      geminiEndpoint: els.geminiEndpointInput.value.trim(),
      geminiApiKey: els.geminiKeyInput.value.trim(),
      geminiModel: els.geminiModelInput.value.trim() || DEFAULT_SETTINGS.geminiModel,
      adsClient: els.adsClientInput.value.trim(),
      adsSlot: els.adsSlotInput.value.trim(),
      checkoutUrl: els.checkoutUrlInput.value.trim(),
      jitsiDomain: els.jitsiDomainInput.value.trim() || DEFAULT_SETTINGS.jitsiDomain,
    };
    localStorage.setItem(STORAGE.settings, JSON.stringify(state.settings));
  }

  function currentConversation() {
    return state.conversations.find((conversation) => conversation.id === state.activeId);
  }

  function getSessionId() {
    let id = localStorage.getItem(STORAGE.session);
    if (!id) {
      id = newId();
      localStorage.setItem(STORAGE.session, id);
    }
    return id;
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
  }

  function titleFromText(text) {
    return text.replace(/\s+/g, " ").slice(0, 64) || "Mechanic case";
  }

  function newId() {
    return window.crypto?.randomUUID ? window.crypto.randomUUID() : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function relativeTime(value) {
    const date = new Date(value);
    const diff = Date.now() - date.getTime();
    const minutes = Math.round(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  }

  function formatTime(value) {
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
  }

  function capitalize(value) {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
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

  function createIcons() {
    if (window.lucide) window.lucide.createIcons();
  }
})();
