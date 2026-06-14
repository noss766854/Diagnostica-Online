import fs from "node:fs";
import path from "node:path";

export function legacyBody(fileName) {
  const html = fs.readFileSync(path.join(process.cwd(), fileName), "utf8");
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!match) return "";

  return match[1]
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replaceAll("./index.html", "/")
    .replaceAll("./admin.html", "/admin")
    .replaceAll("./styles.css", "/styles.css")
    .replaceAll("./config.js", "/config.js")
    .replaceAll("./app.js", "/app.js")
    .replaceAll("./admin.js", "/admin.js")
    .replaceAll("â€º", "&rsaquo;");
}
