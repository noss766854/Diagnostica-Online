import Script from "next/script";
import { legacyBody } from "../../lib/legacy-html";

export const dynamic = "force-static";

export default function AdminPage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: legacyBody("admin.html") }} />
      <Script src="/admin.js" strategy="afterInteractive" />
    </>
  );
}
