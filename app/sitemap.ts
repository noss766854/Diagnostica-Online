import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://diagnostica-online.com", changeFrequency: "weekly", priority: 1 },
    { url: "https://diagnostica-online.com/legal", changeFrequency: "monthly", priority: 0.5 },
  ];
}
