export default function NotFoundPage() {
  return (
    <main className="admin-shell system-state-page">
      <section className="admin-card">
        <p className="label-text">404</p>
        <h1>This page is not in the workshop.</h1>
        <p className="form-message">Return to your diagnostic workspace or open a saved case.</p>
        <div className="dialog-actions">
          <a className="solid-button" href="/">Customer site</a>
        </div>
      </section>
    </main>
  );
}
