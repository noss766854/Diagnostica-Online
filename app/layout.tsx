import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

const DEFAULT_ADSENSE_CLIENT = "ca-pub-6817388263556075";

export const metadata: Metadata = {
  metadataBase: new URL("https://diagnostica-online.com"),
  title: {
    default: "DiagnosticaOnline | Guided vehicle diagnostics",
    template: "%s | DiagnosticaOnline",
  },
  description: "Guided vehicle diagnostics with saved cases, file uploads, evidence-led test plans, and specialist review only for genuine exceptions.",
  applicationName: "DiagnosticaOnline",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "DiagnosticaOnline",
    title: "DiagnosticaOnline | Guided vehicle diagnostics",
    description: "Evidence-led vehicle diagnostics with saved cases, uploads, and clear test plans.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10262d",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const adsenseClient = cleanAdsenseClient(process.env.NEXT_PUBLIC_ADSENSE_CLIENT || DEFAULT_ADSENSE_CLIENT);
  const clientConfig = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    routeraEndpoint: "/api/routera",
    routeraModel: process.env.NEXT_PUBLIC_ROUTERA_MODEL || process.env.ROUTERA_MODEL || "openai/gpt-5.5",
    adsClient: adsenseClient,
    adsSlot: process.env.NEXT_PUBLIC_ADSENSE_SLOT || "",
    checkoutUrl: process.env.NEXT_PUBLIC_CHECKOUT_URL || "/api/checkout",
    jitsiDomain: process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si",
    adminUsername: "MechanicAdmin",
    adminEmail: "admin@diagnostica-online.com",
  };

  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/styles.css" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <meta name="google-adsense-account" content={adsenseClient} />
        <script
          id="google-consent-defaults"
          dangerouslySetInnerHTML={{
            __html:
              "window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});",
          }}
        />
        <script
          id="wrenchline-config"
          dangerouslySetInnerHTML={{
            __html: `window.WRENCHLINE_CONFIG=${JSON.stringify(clientConfig).replace(/</g, "\\u003c")};`,
          }}
        />
      </head>
      <body>
        {children}
        <Script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" strategy="beforeInteractive" />
        <Script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}

function cleanAdsenseClient(value: string): string {
  const match = String(value || "").match(/(?:ca-)?pub-\d{8,}/i);
  if (!match) return DEFAULT_ADSENSE_CLIENT;
  const client = match[0].toLowerCase();
  return client.startsWith("ca-") ? client : `ca-${client}`;
}
