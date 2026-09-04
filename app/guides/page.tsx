import type { Metadata } from "next";
import Script from "next/script";
import { diagnosticGuides } from "@/lib/platform/diagnostic-guides";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Diagnostic Guides",
  description:
    "Original vehicle diagnostic guides for no-start faults, warning lights, overheating, brake noise, electrical faults, and diesel DPF warnings.",
  alternates: { canonical: "/guides" },
  openGraph: {
    title: "Diagnostic Guides | DiagnosticaOnline",
    description: "Practical vehicle diagnostic guides with test order, safety notes, and fault-path explanations.",
    url: "/guides",
  },
};

export default function GuidesPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "DiagnosticaOnline diagnostic guides",
    description: "Original vehicle diagnostic guides for common automotive fault symptoms.",
    itemListElement: diagnosticGuides.map((guide, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `https://diagnostica-online.com/guides/${guide.slug}`,
      name: guide.title,
    })),
  };

  return (
    <>
      <div className="photo-backdrop" aria-hidden="true"></div>
      <div className="shade" aria-hidden="true"></div>
      <div className="guide-page-shell" data-publisher-content="true">
        <header className="masthead guide-header">
          <a className="brand" href="/" aria-label="DiagnosticaOnline home">
            <span className="brand-kicker">DiagnosticaOnline</span>
            <span className="brand-name">Diagnostic Guides</span>
          </a>
          <nav className="nav-actions" aria-label="Guide navigation">
            <a className="nav-link" href="/">Diagnostics</a>
            <a className="nav-link" href="/premium">Premium</a>
            <a className="nav-link" href="/about">About</a>
            <a className="nav-link" href="/legal">Legal</a>
          </nav>
        </header>

        <main className="guide-layout">
          <section className="guide-hero" aria-labelledby="guidesTitle">
            <p className="label-text">Mechanic diagnostic notes</p>
            <h1 id="guidesTitle">Troubleshoot common faults with a proper test order.</h1>
            <p>
              These guides explain what each symptom usually means, what to check first, and how to avoid replacing parts
              before a fault has been proven. Start with a guide, then open a saved case when you want the diagnostic
              service to walk through your specific vehicle.
            </p>
          </section>

          <section className="publisher-ad-band" aria-label="Advertisement">
            <div className="ad-mount banner-ad content-ad" data-ad-surface="publisher" data-ad-slot="top-banner">
              <span>Advertisement</span>
            </div>
          </section>

          <section className="guide-card-grid" aria-label="Diagnostic guide articles">
            {diagnosticGuides.map((guide) => (
              <article className="guide-card" key={guide.slug}>
                <div>
                  <span>{guide.category}</span>
                  <h2>
                    <a href={`/guides/${guide.slug}`}>{guide.title}</a>
                  </h2>
                  <p>{guide.description}</p>
                </div>
                <footer>
                  <small>{guide.readMinutes} minute read</small>
                  <a href={`/guides/${guide.slug}`}>Read guide</a>
                </footer>
              </article>
            ))}
          </section>

          <section className="guide-note-panel">
            <h2>How these guides should be used</h2>
            <p>
              Vehicle symptoms can share causes across fuel, ignition, wiring, control modules, and mechanical systems.
              A good diagnosis records the vehicle details, reads codes without clearing useful data, proves what is
              missing, then chooses the next test from the result.
            </p>
            <p>
              Stop and get local help if the vehicle has brake loss, steering loss, fire risk, fuel leakage, smoke, severe
              overheating, high-voltage warnings, or any condition that could make testing unsafe.
            </p>
            <p>
              Learn more about the service, editorial limits, and support contact on the <a href="/about">About page</a>.
            </p>
          </section>

          <section className="publisher-ad-band" aria-label="Advertisement">
            <div className="ad-mount banner-ad content-ad" data-ad-surface="publisher" data-ad-slot="bottom-banner">
              <span>Advertisement</span>
            </div>
          </section>
        </main>
      </div>
      <ContentConsentBanner />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Script src="/content-ads.js" strategy="afterInteractive" />
    </>
  );
}

function ContentConsentBanner() {
  return (
    <div className="consent-banner content-consent-banner" data-content-consent hidden>
      <div>
        <strong data-consent-title>Cookie and ad consent</strong>
        <p data-consent-body>
          We use essential storage for site preferences. With your consent, we also use ads on free content pages.
        </p>
        <a href="/legal" data-consent-legal>
          Legal and privacy
        </a>
      </div>
      <div className="consent-actions">
        <button className="ghost-button" type="button" data-consent-reject>
          Essential only
        </button>
        <button className="solid-button" type="button" data-consent-accept>
          Accept ads
        </button>
      </div>
    </div>
  );
}
