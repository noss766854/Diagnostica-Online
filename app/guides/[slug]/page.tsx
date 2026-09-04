import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { diagnosticGuides, getDiagnosticGuide } from "@/lib/platform/diagnostic-guides";

interface GuidePageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-static";

export function generateStaticParams() {
  return diagnosticGuides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getDiagnosticGuide(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      title: `${guide.title} | DiagnosticaOnline`,
      description: guide.description,
      url: `/guides/${guide.slug}`,
      type: "article",
      publishedTime: guide.updatedAt,
      modifiedTime: guide.updatedAt,
    },
  };
}

export default async function GuideArticlePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getDiagnosticGuide(slug);
  if (!guide) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    datePublished: guide.updatedAt,
    dateModified: guide.updatedAt,
    author: {
      "@type": "Organization",
      name: "DiagnosticaOnline",
      url: "https://diagnostica-online.com",
    },
    publisher: {
      "@type": "Organization",
      name: "DiagnosticaOnline",
      url: "https://diagnostica-online.com",
    },
    mainEntityOfPage: `https://diagnostica-online.com/guides/${guide.slug}`,
  };

  return (
    <>
      <div className="photo-backdrop" aria-hidden="true"></div>
      <div className="shade" aria-hidden="true"></div>
      <div className="guide-page-shell article-shell" data-publisher-content="true">
        <header className="masthead guide-header">
          <a className="brand" href="/" aria-label="DiagnosticaOnline home">
            <span className="brand-kicker">DiagnosticaOnline</span>
            <span className="brand-name">Diagnostic Guide</span>
          </a>
          <nav className="nav-actions" aria-label="Guide navigation">
            <a className="nav-link" href="/guides">All guides</a>
            <a className="nav-link" href="/">Diagnostics</a>
            <a className="nav-link" href="/about">About</a>
            <a className="nav-link" href="/legal">Legal</a>
          </nav>
        </header>

        <main className="guide-article-layout">
          <article className="guide-article">
            <header className="guide-article-hero">
              <p className="label-text">{guide.category}</p>
              <h1>{guide.title}</h1>
              <p>{guide.description}</p>
              <div className="article-meta">
                <span>Updated {formatDate(guide.updatedAt)}</span>
                <span>{guide.readMinutes} minute read</span>
              </div>
            </header>

            <section className="guide-key-points" aria-label="Key points">
              {guide.heroPoints.map((point) => (
                <p key={point}>{point}</p>
              ))}
            </section>

            {guide.sections.map((section, index) => (
              <section className="guide-article-section" key={section.heading}>
                <h2>{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {index === 1 ? (
                  <section className="publisher-ad-band article-inline-ad" aria-label="Advertisement">
                    <div className="ad-mount inline-ad content-ad" data-ad-surface="publisher" data-ad-slot="inline-one">
                      <span>Advertisement</span>
                    </div>
                  </section>
                ) : null}
              </section>
            ))}

            <section className="guide-checklist">
              <h2>Diagnostic checklist</h2>
              <ul>
                {guide.checklist.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="guide-faq">
              <h2>Frequently asked questions</h2>
              {guide.faqs.map((faq) => (
                <section key={faq.question}>
                  <h3>{faq.question}</h3>
                  <p>{faq.answer}</p>
                </section>
              ))}
            </section>

            <section className="publisher-ad-band" aria-label="Advertisement">
              <div className="ad-mount banner-ad content-ad" data-ad-surface="publisher" data-ad-slot="bottom-banner">
                <span>Advertisement</span>
              </div>
            </section>
          </article>

          <aside className="guide-sidebar" aria-label="Related diagnostic guides">
            <section className="guide-sidebar-card">
              <h2>Continue diagnosing</h2>
              <p>Open a saved case when you want the diagnostic service to adapt the test order to your vehicle and symptoms.</p>
              <a className="solid-button" href="/">
                Start a saved case
              </a>
            </section>
            <section className="guide-sidebar-card">
              <h2>More guides</h2>
              <ul>
                {diagnosticGuides
                  .filter((item) => item.slug !== guide.slug)
                  .slice(0, 4)
                  .map((item) => (
                    <li key={item.slug}>
                      <a href={`/guides/${item.slug}`}>{item.title}</a>
                    </li>
                  ))}
              </ul>
            </section>
            <section className="publisher-ad-band sidebar-publisher-ad" aria-label="Advertisement">
              <div className="ad-mount side-ad content-ad" data-ad-surface="publisher" data-ad-slot="right-middle">
                <span>Advertisement</span>
              </div>
            </section>
          </aside>
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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}
