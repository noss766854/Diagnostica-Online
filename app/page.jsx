import Script from "next/script";
import { legacyBody } from "../lib/legacy-html";

export const dynamic = "force-static";

export default function HomePage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: legacyBody("index.html") }} />
      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}
