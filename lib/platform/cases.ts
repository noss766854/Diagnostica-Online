import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthContext } from "@/lib/platform/auth";
import { HttpError } from "@/lib/platform/http";
import type { DiagnosticCaseRecord } from "@/types/diagnostics";

export async function loadCaseForUser(
  supabase: SupabaseClient,
  context: AuthContext,
  caseId: string
): Promise<DiagnosticCaseRecord> {
  const { data, error } = await supabase
    .from("diagnostic_cases")
    .select("*,vehicle:vehicles(*)")
    .eq("id", caseId)
    .maybeSingle();
  if (error) throw new HttpError(500, "The diagnostic case could not be loaded.");
  if (!data) throw new HttpError(404, "Diagnostic case not found.");
  if (data.owner_id !== context.user.id && context.profile.role !== "admin") {
    throw new HttpError(403, "You do not have access to this diagnostic case.");
  }
  return data as DiagnosticCaseRecord;
}

export function inferCasePriority(text: string): "normal" | "urgent" {
  return /brake loss|no brakes|fuel leak|fuel smell|smoke|fire|oil pressure|steering loss|severe overheat|high voltage|battery fire/i.test(text)
    ? "urgent"
    : "normal";
}

export function caseTitle(input: {
  title?: string;
  year: number;
  make: string;
  model: string;
  symptoms: string;
}): string {
  if (input.title?.trim()) return input.title.trim();
  const symptom = input.symptoms.replace(/\s+/g, " ").trim().slice(0, 70);
  return `${input.year} ${input.make} ${input.model}: ${symptom}`.slice(0, 140);
}
