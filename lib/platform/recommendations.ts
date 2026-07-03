import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiagnosticCaseRecord, RecommendedToolRecord, ToolCategory } from "@/types/diagnostics";

export async function recommendationsForCase(
  supabase: SupabaseClient,
  diagnosticCase: DiagnosticCaseRecord
): Promise<Array<RecommendedToolRecord & { match_reason: string }>> {
  const { data, error } = await supabase
    .from("recommended_tools")
    .select("id,name,category,description,affiliate_url,image_url,rule_tags,dtc_prefixes,priority,active,created_at,updated_at")
    .eq("active", true)
    .order("priority", { ascending: true })
    .limit(100);
  if (error || !data) return [];

  const searchable = `${diagnosticCase.title} ${diagnosticCase.symptoms} ${diagnosticCase.previous_work} ${diagnosticCase.ai_summary}`.toLowerCase();
  const dtcCodes = diagnosticCase.dtc_codes.map((code) => code.toUpperCase());
  const categorySignals = inferredCategories(searchable, dtcCodes);

  return (data as RecommendedToolRecord[])
    .map((tool) => {
      let score = 0;
      const reasons: string[] = [];
      const dtcMatch = (tool.dtc_prefixes || []).find((prefix) => dtcCodes.some((code) => code.startsWith(prefix.toUpperCase())));
      if (dtcMatch) {
        score += 50;
        reasons.push(`matches DTC ${dtcMatch}`);
      }
      const tagMatches = (tool.rule_tags || []).filter((tag) => searchable.includes(tag.toLowerCase()));
      if (tagMatches.length) {
        score += 15 + Math.min(tagMatches.length, 3) * 5;
        reasons.push(`matches ${tagMatches.slice(0, 3).join(", ")}`);
      }
      if (categorySignals.has(tool.category)) {
        score += 20;
        reasons.push(categoryReason(tool.category));
      }
      return { tool, score, match_reason: reasons.join("; ") || "general diagnostic support" };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.tool.priority - b.tool.priority)
    .slice(0, 6)
    .map((entry) => ({ ...entry.tool, match_reason: entry.match_reason }));
}

function inferredCategories(searchable: string, dtcCodes: string[]): Set<ToolCategory> {
  const categories = new Set<ToolCategory>(["repair_manual"]);
  if (dtcCodes.length || /check engine|fault code|dtc|obd|warning light/.test(searchable)) {
    categories.add("obd_scanner");
    categories.add("scan_tool");
  }
  if (/battery|voltage|ground|short|open circuit|wiring|sensor|alternator|starter|electrical/.test(searchable)) {
    categories.add("multimeter");
  }
  if (/vacuum|lean|unmetered air|intake leak|evap|smoke test/.test(searchable)) {
    categories.add("smoke_tester");
  }
  if (/vacuum actuator|brake booster|vacuum pump|bleed|pressure test/.test(searchable)) {
    categories.add("vacuum_pump");
  }
  return categories;
}

function categoryReason(category: ToolCategory): string {
  const reasons: Record<ToolCategory, string> = {
    obd_scanner: "useful for reading and clearing diagnostic data after repair",
    scan_tool: "useful for live data and module diagnostics",
    multimeter: "useful for electrical measurements",
    smoke_tester: "useful for leak testing",
    vacuum_pump: "useful for vacuum or pressure testing",
    repair_manual: "useful for model-specific procedures and specifications",
    other: "relevant to this diagnostic workflow",
  };
  return reasons[category];
}
