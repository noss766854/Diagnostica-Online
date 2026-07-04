export const CANONICAL_SITE_URL = "https://diagnostica-online.com";

export function canonicalSiteOrigin(request: Request): string {
  const configured = normalizeOrigin(process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "");
  const deployedOnVercel = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV || process.env.VERCEL_URL);

  if (configured && !isLocalOrigin(configured)) return configured;
  if (deployedOnVercel) return CANONICAL_SITE_URL;
  if (configured) return configured;

  const requestOrigin = normalizeOrigin(new URL(request.url).origin);
  return requestOrigin || CANONICAL_SITE_URL;
}

function normalizeOrigin(value: string): string {
  const candidate = String(value || "").trim();
  if (!candidate) return "";
  try {
    const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
    const url = new URL(withProtocol);
    const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase());
    if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) return "";
    return url.origin.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function isLocalOrigin(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}
