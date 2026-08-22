(function () {
  const SETTINGS_KEY = "wrenchline.settings";
  const COPY = {
    en: { brand: "Email Verification", customer: "Customer site", kicker: "Account verification", title: "Your email is being confirmed.", working: "Finishing the verification with Supabase...", signedIn: "Email verified and you are signed in. Continue to your saved mechanic cases.", verified: "Email verified. You can now log in with your email and password.", invalid: "This verification link is invalid or has expired. Create the account again to receive a fresh link.", continue: "Continue to site" },
    es: { brand: "Verificación de correo", customer: "Sitio de clientes", kicker: "Verificación de cuenta", title: "Estamos confirmando tu correo.", working: "Finalizando la verificación segura...", signedIn: "Correo verificado. Has iniciado sesión y puedes continuar con tus casos guardados.", verified: "Correo verificado. Ya puedes iniciar sesión.", invalid: "Este enlace no es válido o ha caducado. Crea la cuenta de nuevo para recibir otro enlace.", continue: "Continuar al sitio" },
    ro: { brand: "Verificare e-mail", customer: "Site clienți", kicker: "Verificarea contului", title: "Adresa de e-mail este confirmată.", working: "Se finalizează verificarea securizată...", signedIn: "E-mail verificat. Ești autentificat și poți continua cazurile salvate.", verified: "E-mail verificat. Acum te poți autentifica.", invalid: "Linkul de verificare este invalid sau a expirat. Creează din nou contul pentru un link nou.", continue: "Continuă către site" },
    "ca-valencia": { brand: "Verificació de correu", customer: "Lloc de clients", kicker: "Verificació del compte", title: "Estem confirmant el teu correu.", working: "S'està finalitzant la verificació segura...", signedIn: "Correu verificat. Has iniciat sessió i pots continuar els casos guardats.", verified: "Correu verificat. Ja pots iniciar sessió.", invalid: "L'enllaç no és vàlid o ha caducat. Crea el compte de nou per a rebre'n un altre.", continue: "Continua al lloc" },
  };
  const language = localStorage.getItem("diagnostica.language") || "en";
  const copy = COPY[language] || COPY.en;
  const status = document.getElementById("verifyStatus");
  const loginLink = document.getElementById("verifyLoginLink");

  document.documentElement.lang = language === "ca-valencia" ? "ca" : language;
  setText("verifyBrandName", copy.brand);
  setText("verifyCustomerLink", copy.customer);
  setText("verifyKicker", copy.kicker);
  setText("verifyTitle", copy.title);
  setText("verifyStatus", copy.working);
  setText("verifyLoginLink", copy.continue);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", verifyEmail);
  } else {
    verifyEmail();
  }

  async function verifyEmail() {
    try {
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const error = params.get("error_description") || hash.get("error_description") || params.get("error") || hash.get("error");
      if (error) {
        setStatus(decodeURIComponent(error));
        return;
      }

      const settings = loadSettings();
      const config = window.WRENCHLINE_CONFIG || {};
      const supabaseUrl = settings.supabaseUrl || config.supabaseUrl;
      const supabaseAnonKey = settings.supabaseAnonKey || config.supabaseAnonKey;

      if (!supabaseUrl || !supabaseAnonKey || !window.supabase) {
        setStatus(copy.invalid);
        return;
      }

      const client = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
      const code = params.get("code");
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (code) {
        const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
        clearAuthUrl();
      } else if (accessToken && refreshToken) {
        const { error: sessionError } = await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;
        clearAuthUrl();
      }

      const { data, error: sessionReadError } = await client.auth.getSession();
      if (sessionReadError) throw sessionReadError;
      if (data?.session) {
        setStatus(copy.signedIn);
      } else if (!code && !(accessToken && refreshToken)) {
        setStatus(copy.invalid);
      } else {
        setStatus(copy.verified);
      }
    } catch (error) {
      setStatus(error?.message || copy.verified);
    }
  }

  function setStatus(message) {
    status.textContent = message;
    if (loginLink) loginLink.textContent = copy.continue;
  }

  function clearAuthUrl() {
    window.history.replaceState({}, document.title, "/verify");
  }

  function loadSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }
})();
