import Script from "next/script";

export const dynamic = "force-static";

export default function VerifyPage() {
  return (
    <>
      <div className="photo-backdrop" aria-hidden="true" />
      <div className="shade" aria-hidden="true" />
      <div className="page-shell admin-page">
        <header className="masthead">
          <a className="brand" href="/" aria-label="DiagnosticaOnline home">
            <span className="brand-kicker">DiagnosticaOnline</span>
            <span className="brand-name" id="verifyBrandName">Email Verification</span>
          </a>
          <nav className="nav-actions" aria-label="Verification navigation">
            <a className="nav-link" href="/" id="verifyCustomerLink">Customer site</a>
          </nav>
        </header>
        <main className="admin-shell">
          <section className="admin-card">
            <p className="label-text" id="verifyKicker">Account verification</p>
            <h1 id="verifyTitle">Your email is being confirmed.</h1>
            <p className="form-message" id="verifyStatus">Finishing the verification with Supabase...</p>
            <div className="dialog-actions">
              <a className="solid-button" id="verifyLoginLink" href="/">Continue</a>
            </div>
          </section>
        </main>
      </div>
      <Script src="/verify.js" strategy="afterInteractive" />
    </>
  );
}
