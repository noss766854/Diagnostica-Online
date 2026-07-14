import { requireActiveUser } from "@/lib/platform/auth";
import { errorResponse, HttpError, json, readJson } from "@/lib/platform/http";
import { supabaseService } from "@/lib/platform/supabase";
import { accountPreferencesSchema } from "@/lib/platform/validation";
import type { SupportedLanguage } from "@/types/diagnostics";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const context = await requireActiveUser(request);
    const supabase = supabaseService();
    const { data, error } = await supabase.from("profiles").select("preferred_language").eq("id", context.user.id).maybeSingle();
    if (error) throw new HttpError(500, "The language preference could not be loaded. Run the latest Supabase schema.");
    return json({ language: normalizeLanguage(data?.preferred_language) });
  } catch (error) {
    return errorResponse(error, "The language preference could not be loaded.");
  }
}

export async function PUT(request: Request): Promise<Response> {
  try {
    const context = await requireActiveUser(request);
    const input = accountPreferencesSchema.parse(await readJson(request));
    const supabase = supabaseService();
    const { data, error } = await supabase
      .from("profiles")
      .update({ preferred_language: input.language })
      .eq("id", context.user.id)
      .select("preferred_language")
      .single();
    if (error || !data) throw new HttpError(500, "The language preference could not be saved. Run the latest Supabase schema.");
    return json({ language: normalizeLanguage(data.preferred_language) });
  } catch (error) {
    return errorResponse(error, "The language preference could not be saved.");
  }
}

function normalizeLanguage(value: unknown): SupportedLanguage {
  const language = String(value || "en") as SupportedLanguage;
  return ["en", "es", "ro", "ca-valencia"].includes(language) ? language : "en";
}
