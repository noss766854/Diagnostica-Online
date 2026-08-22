import Script from "next/script";

export const dynamic = "force-static";

export default function ResetPasswordPage() {
  return (
    <>
      <div className="photo-backdrop" aria-hidden="true" />
      <div className="shade" aria-hidden="true" />
      <div className="page-shell admin-page">
        <header className="masthead">
          <a className="brand" href="/" aria-label="DiagnosticaOnline home">
            <span className="brand-kicker">DiagnosticaOnline</span>
            <span className="brand-name" id="resetBrandName">Password Recovery</span>
          </a>
          <nav className="nav-actions" aria-label="Password recovery navigation">
            <a className="nav-link" href="/" id="resetCustomerLink">Customer site</a>
          </nav>
        </header>
        <main className="admin-shell">
          <section className="admin-card">
            <p className="label-text" id="resetKicker">Secure account</p>
            <h1 id="resetTitle">Choose a new password.</h1>
            <p className="form-message" id="resetStatus" aria-live="polite">Checking your secure recovery link...</p>
            <form className="auth-form reset-password-form" id="resetPasswordForm" hidden>
              <label>
                <span id="resetPasswordLabel">New password</span>
                <input id="resetPasswordInput" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
              </label>
              <label>
                <span id="resetConfirmLabel">Confirm new password</span>
                <input id="resetConfirmInput" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
              </label>
              <div className="dialog-actions">
                <button className="solid-button" id="resetSubmitBtn" type="submit">Update password</button>
              </div>
            </form>
            <div className="dialog-actions" id="resetContinueActions" hidden>
              <a className="solid-button" href="/" id="resetContinueLink">Continue to site</a>
            </div>
          </section>
        </main>
      </div>
      <Script src="/reset-password.js" strategy="afterInteractive" />
    </>
  );
}
