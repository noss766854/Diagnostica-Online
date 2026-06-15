import Script from "next/script";
import { legacyBody } from "../../lib/legacy-html";

export const dynamic = "force-static";

export default function LegalPage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: legacyBody("legal.html") }} />
      <Script src="/legal.js" strategy="afterInteractive" />
    </>
  );
}
