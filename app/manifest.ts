import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DiagnosticaOnline",
    short_name: "Diagnostica",
    description: "Guided vehicle diagnostics and saved mechanic cases.",
    start_url: "/",
    display: "standalone",
    background_color: "#10262d",
    theme_color: "#10262d",
  };
}
