import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/legal"], disallow: ["/admin", "/api/", "/verify", "/reset-password"] },
    ],
    sitemap: "https://diagnostica-online.com/sitemap.xml",
    host: "https://diagnostica-online.com",
  };
}
