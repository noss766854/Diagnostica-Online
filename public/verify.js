(function () {
  const SETTINGS_KEY = "wrenchline.settings";
  const status = document.getElementById("verifyStatus");
  const loginLink = document.getElementById("verifyLoginLink");

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
        setStatus("Email verified. Return to the site and log in with your email and password.");
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
        setStatus("Email verified and you are signed in. Continue to your saved mechanic cases.");
      } else {
        setStatus("Email verified. You can now log in with your email and password.");
      }
    } catch (error) {
      setStatus(error?.message || "Verification finished. Return to the site and log in.");
    }
  }

  function setStatus(message) {
    status.textContent = message;
    if (loginLink) loginLink.textContent = "Continue to site";
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
})();
