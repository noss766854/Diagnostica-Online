(function () {
  const COPY = {
    en: { brand: "Password Recovery", customer: "Customer site", kicker: "Secure account", title: "Choose a new password.", checking: "Checking your secure recovery link...", password: "New password", confirm: "Confirm new password", submit: "Update password", mismatch: "The passwords do not match.", short: "Use at least 8 characters.", saving: "Updating your password...", success: "Password updated. You are signed in and can continue to your saved cases.", invalid: "This recovery link is invalid or has expired. Request a new one from the login screen.", continue: "Continue to site" },
    es: { brand: "Recuperar contraseña", customer: "Sitio de clientes", kicker: "Cuenta segura", title: "Elige una contraseña nueva.", checking: "Comprobando el enlace seguro...", password: "Contraseña nueva", confirm: "Confirmar contraseña", submit: "Actualizar contraseña", mismatch: "Las contraseñas no coinciden.", short: "Usa al menos 8 caracteres.", saving: "Actualizando la contraseña...", success: "Contraseña actualizada. Has iniciado sesión y puedes continuar con tus casos.", invalid: "Este enlace no es válido o ha caducado. Solicita uno nuevo desde la pantalla de inicio de sesión.", continue: "Continuar al sitio" },
    ro: { brand: "Recuperare parolă", customer: "Site clienți", kicker: "Cont securizat", title: "Alege o parolă nouă.", checking: "Se verifică linkul securizat...", password: "Parolă nouă", confirm: "Confirmă parola nouă", submit: "Actualizează parola", mismatch: "Parolele nu coincid.", short: "Folosește cel puțin 8 caractere.", saving: "Se actualizează parola...", success: "Parola a fost actualizată. Ești autentificat și poți continua cazurile salvate.", invalid: "Linkul este invalid sau a expirat. Solicită unul nou din ecranul de autentificare.", continue: "Continuă către site" },
    "ca-valencia": { brand: "Recuperar contrasenya", customer: "Lloc de clients", kicker: "Compte segur", title: "Tria una contrasenya nova.", checking: "S'està comprovant l'enllaç segur...", password: "Contrasenya nova", confirm: "Confirma la contrasenya", submit: "Actualitza la contrasenya", mismatch: "Les contrasenyes no coincidixen.", short: "Usa almenys 8 caràcters.", saving: "S'està actualitzant la contrasenya...", success: "Contrasenya actualitzada. Has iniciat sessió i pots continuar els casos guardats.", invalid: "L'enllaç no és vàlid o ha caducat. Demana'n un altre des de la pantalla d'inici de sessió.", continue: "Continua al lloc" },
  };
  const language = localStorage.getItem("diagnostica.language") || "en";
  const copy = COPY[language] || COPY.en;
  const form = document.getElementById("resetPasswordForm");
  const status = document.getElementById("resetStatus");
  const actions = document.getElementById("resetContinueActions");
  const passwordInput = document.getElementById("resetPasswordInput");
  const confirmInput = document.getElementById("resetConfirmInput");
  const submit = document.getElementById("resetSubmitBtn");
  let client = null;

  applyCopy();
  form.addEventListener("submit", updatePassword);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", prepareSession);
  else prepareSession();

  async function prepareSession() {
    try {
      const config = window.WRENCHLINE_CONFIG || {};
      const settings = readSettings();
      const supabaseUrl = settings.supabaseUrl || config.supabaseUrl;
      const supabaseAnonKey = settings.supabaseAnonKey || config.supabaseAnonKey;
      if (!supabaseUrl || !supabaseAnonKey || !window.supabase) throw new Error(copy.invalid);
      client = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const error = params.get("error_description") || hash.get("error_description") || params.get("error") || hash.get("error");
      if (error) throw new Error(decodeURIComponent(error));
      const code = params.get("code");
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (code) {
        const result = await client.auth.exchangeCodeForSession(code);
        if (result.error) throw result.error;
      } else if (accessToken && refreshToken) {
        const result = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (result.error) throw result.error;
      }
      const session = await client.auth.getSession();
      if (session.error || !session.data?.session) throw session.error || new Error(copy.invalid);
      window.history.replaceState({}, document.title, "/reset-password");
      status.textContent = copy.title;
      form.hidden = false;
      passwordInput.focus();
    } catch (error) {
      status.textContent = error?.message || copy.invalid;
      form.hidden = true;
    }
  }

  async function updatePassword(event) {
    event.preventDefault();
    if (passwordInput.value.length < 8) return setStatus(copy.short);
    if (passwordInput.value !== confirmInput.value) return setStatus(copy.mismatch);
    submit.disabled = true;
    setStatus(copy.saving);
    try {
      const result = await client.auth.updateUser({ password: passwordInput.value });
      if (result.error) throw result.error;
      form.hidden = true;
      actions.hidden = false;
      setStatus(copy.success);
    } catch (error) {
      setStatus(error?.message || copy.invalid);
    } finally {
      submit.disabled = false;
    }
  }

  function applyCopy() {
    document.documentElement.lang = language === "ca-valencia" ? "ca" : language;
    setText("resetBrandName", copy.brand);
    setText("resetCustomerLink", copy.customer);
    setText("resetKicker", copy.kicker);
    setText("resetTitle", copy.title);
    setText("resetStatus", copy.checking);
    setText("resetPasswordLabel", copy.password);
    setText("resetConfirmLabel", copy.confirm);
    setText("resetSubmitBtn", copy.submit);
    setText("resetContinueLink", copy.continue);
  }

  function setStatus(message) { status.textContent = message; }
  function setText(id, value) { const element = document.getElementById(id); if (element) element.textContent = value; }
  function readSettings() { try { return JSON.parse(localStorage.getItem("wrenchline.settings") || "{}"); } catch { return {}; } }
})();
