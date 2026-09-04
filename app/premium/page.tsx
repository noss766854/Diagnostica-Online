import Script from "next/script";

export const dynamic = "force-static";
export const metadata = {
  title: "Premium | DiagnosticaOnline",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PremiumPage() {
  return (
    <>
      <div className="premium-page-shell">
        <header className="masthead premium-header">
          <a className="brand" href="/" aria-label="DiagnosticaOnline home">
            <span className="brand-kicker">DiagnosticaOnline</span>
            <span className="brand-name">Premium</span>
          </a>
          <nav className="nav-actions" aria-label="Premium navigation">
            <span className="account-badge" id="premiumAccountBadge">Logged out</span>
            <a className="nav-link" href="/">Customer site</a>
            <a className="nav-link" href="/legal">Legal</a>
            <button className="nav-link" id="premiumAdminBtn" type="button" hidden>Admin dashboard</button>
            <button className="nav-link" id="premiumLogoutBtn" type="button" hidden>Sign out</button>
          </nav>
        </header>

        <main className="premium-account-grid">
          <section className="premium-account-panel">
            <p className="label-text">Subscription access</p>
            <h1>Manage DiagnosticaOnline Premium</h1>
            <p className="premium-copy">
              Start Premium for higher diagnostic limits and no ads, or manage/cancel an active subscription in Stripe.
            </p>
            <div className="plan-strip premium-plan-strip" id="premiumPlanStrip">
              <span className="plan-badge free">Free</span>
              <span>Loading account limits...</span>
            </div>
            <div className="premium-plan-list" id="premiumPlanChoices" hidden></div>
            <div className="premium-actions-row">
              <button className="solid-button" id="premiumPortalBtn" type="button" hidden>
                <i data-lucide="credit-card"></i>
                <span>Manage or cancel subscription</span>
              </button>
              <button className="solid-button" id="premiumCheckoutBtn" type="button" hidden>
                <i data-lucide="crown"></i>
                <span>Start Premium</span>
              </button>
              <a className="secondary-button" href="/">
                <i data-lucide="message-square"></i>
                <span>Open diagnostics</span>
              </a>
            </div>
            <p className="form-message" id="premiumPageMessage"></p>
          </section>

          <section className="premium-account-panel" id="premiumLoginPanel">
            <p className="label-text">Account login</p>
            <h2>Log in to continue.</h2>
            <form className="auth-form" id="premiumLoginForm">
              <label>
                <span>Email</span>
                <input id="premiumEmailInput" type="email" autoComplete="email" required />
              </label>
              <label>
                <span>Password</span>
                <input id="premiumPasswordInput" type="password" autoComplete="current-password" required />
              </label>
              <button className="solid-button" id="premiumLoginBtn" type="submit">
                <i data-lucide="log-in"></i>
                <span>Login</span>
              </button>
            </form>
            <p className="form-message" id="premiumLoginMessage"></p>
            <a className="nav-link inline-nav-link" href="/">Create an account from the main site</a>
          </section>
        </main>
      </div>
      <Script src="/premium.js" strategy="afterInteractive" />
    </>
  );
}
