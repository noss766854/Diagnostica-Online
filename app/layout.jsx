import Script from "next/script";

export const metadata = {
  title: "Diagnostica Online",
  description:
    "AI-assisted mechanic intake, saved conversations, ads, and paid voice or video technician handoff.",
};

export default function RootLayout({ children }) {
  const clientConfig = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    geminiEndpoint: "/api/gemini",
    geminiModel: process.env.NEXT_PUBLIC_GEMINI_MODEL || process.env.GEMINI_MODEL || "gemini-2.5-flash",
    adsClient: process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "",
    adsSlot: process.env.NEXT_PUBLIC_ADSENSE_SLOT || "",
    checkoutUrl: process.env.NEXT_PUBLIC_CHECKOUT_URL || "",
    jitsiDomain: process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si",
    adminUsername: "MechanicAdmin",
    adminEmail: "admin@diagnostica-online.com",
  };

  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/styles.css" />
        <link rel="preconnect" href="https://images.unsplash.com" />
      </head>
      <body>
        {children}
        <Script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" strategy="beforeInteractive" />
        <Script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js" strategy="beforeInteractive" />
        <Script
          id="wrenchline-config"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.WRENCHLINE_CONFIG=${JSON.stringify(clientConfig).replace(/</g, "\\u003c")};`,
          }}
        />
      </body>
    </html>
  );
}
