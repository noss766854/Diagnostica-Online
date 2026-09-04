import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: ["/", "/about", "/guides", "/legal", "/ads.txt"], disallow: ["/admin", "/api/", "/premium", "/verify", "/reset-password"] },
    ],
    sitemap: "https://diagnostica-online.com/sitemap.xml",
    host: "https://diagnostica-online.com",
  };
}
