import type { MetadataRoute } from "next";
import { diagnosticGuides } from "@/lib/platform/diagnostic-guides";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://diagnostica-online.com", changeFrequency: "weekly", priority: 1 },
    { url: "https://diagnostica-online.com/about", changeFrequency: "monthly", priority: 0.65 },
    { url: "https://diagnostica-online.com/guides", changeFrequency: "weekly", priority: 0.85 },
    ...diagnosticGuides.map((guide) => ({
      url: `https://diagnostica-online.com/guides/${guide.slug}`,
      lastModified: guide.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
    { url: "https://diagnostica-online.com/legal", changeFrequency: "monthly", priority: 0.5 },
  ];
}
