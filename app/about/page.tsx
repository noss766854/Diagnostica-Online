import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "About",
  description: "About DiagnosticaOnline, its vehicle diagnostic workflow, safety limits, and support contact.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About DiagnosticaOnline",
    description: "How DiagnosticaOnline provides guided vehicle diagnostic support and safety-focused test plans.",
    url: "/about",
  },
};

export default function AboutPage() {
  return (
    <>
      <div className="photo-backdrop" aria-hidden="true"></div>
      <div className="shade" aria-hidden="true"></div>
      <div className="guide-page-shell">
        <header className="masthead guide-header">
          <a className="brand" href="/" aria-label="DiagnosticaOnline home">
            <span className="brand-kicker">DiagnosticaOnline</span>
            <span className="brand-name">About</span>
          </a>
          <nav className="nav-actions" aria-label="About navigation">
            <a className="nav-link" href="/">Diagnostics</a>
            <a className="nav-link" href="/guides">Guides</a>
            <a className="nav-link" href="/legal">Legal</a>
          </nav>
        </header>

        <main className="guide-layout">
          <section className="guide-hero">
            <p className="label-text">What this service does</p>
            <h1>Guided vehicle diagnostics, built around evidence before parts.</h1>
            <p>
              DiagnosticaOnline helps drivers organize symptoms, vehicle details, scan reports, and test results into a
              structured diagnostic case. The service is designed to ask for missing details, suggest a sensible test
              order, explain what each result means, and flag safety conditions where remote guidance is not enough.
            </p>
          </section>

          <section className="guide-note-panel">
            <h2>How diagnostic guidance is produced</h2>
            <p>
              The diagnostic flow starts with basic vehicle information such as year, make, model, engine, fuel type,
              transmission, warning lights, DTC fault codes, recent work, and the exact conditions where the symptom
              appears. From there it narrows the fault path using observations and test results rather than telling users
              to replace parts immediately.
            </p>
            <p>
              Guidance is informational and remote. It cannot inspect the vehicle, verify workmanship, check recalls, or
              replace factory service information. The site refuses illegal emissions defeat, odometer manipulation,
              unlawful immobilizer bypass, theft enablement, and unsafe bypass instructions.
            </p>
          </section>

          <section className="guide-note-panel">
            <h2>Contact and corrections</h2>
            <p>
              For account, billing, privacy, correction, or safety concerns, contact support at
              {" "}
              <a href="mailto:support@diagnostica-online.com">support@diagnostica-online.com</a>. If a guide needs a
              correction or a diagnostic topic should be covered in more depth, include the guide title, vehicle context,
              and the specific issue you noticed.
            </p>
          </section>
        </main>
      </div>
    </>
  );
}
