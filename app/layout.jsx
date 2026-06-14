import Script from "next/script";

export const metadata = {
  title: "Diagnostica Online",
  description:
    "AI-assisted mechanic intake, saved conversations, ads, and paid voice or video technician handoff.",
};

export default function RootLayout({ children }) {
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
        <Script src="/config.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
