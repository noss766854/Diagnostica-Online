"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="admin-shell system-state-page">
      <section className="admin-card">
        <p className="label-text">DiagnosticaOnline</p>
        <h1>That page could not be loaded.</h1>
        <p className="form-message">Your saved case has not been changed. Try loading the page again.</p>
        <div className="dialog-actions">
          <a className="ghost-button" href="/">Customer site</a>
          <button className="solid-button" type="button" onClick={reset}>Try again</button>
        </div>
      </section>
    </main>
  );
}
