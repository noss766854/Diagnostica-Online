import { requireActiveUser } from "@/lib/platform/auth";
import { loadCaseForUser } from "@/lib/platform/cases";
import { getEntitlements } from "@/lib/platform/entitlements";
import { errorResponse, HttpError, json, readJson } from "@/lib/platform/http";
import { recommendationsForCase } from "@/lib/platform/recommendations";
import { supabaseService } from "@/lib/platform/supabase";
import { updateCaseSchema } from "@/lib/platform/validation";
import type { DiagnosticMessageRecord, DiagnosticUploadRecord } from "@/types/diagnostics";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ caseId: string }>;
}

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  try {
    const { caseId } = await params;
    const context = await requireActiveUser(request);
    const supabase = supabaseService();
    const diagnosticCase = await loadCaseForUser(supabase, context, caseId);
    const [{ data: messages, error: messageError }, { data: uploads, error: uploadError }, entitlements, recommendations] = await Promise.all([
      supabase.from("diagnostic_messages").select("*").eq("case_id", caseId).order("created_at", { ascending: true }).limit(250),
      supabase.from("diagnostic_uploads").select("*").eq("case_id", caseId).order("created_at", { ascending: false }).limit(100),
      getEntitlements(supabase, context),
      recommendationsForCase(supabase, diagnosticCase),
    ]);
    if (messageError) throw new HttpError(500, "Diagnostic messages could not be loaded.");
    if (uploadError) throw new HttpError(500, "Diagnostic uploads could not be loaded.");

    const uploadsWithUrls = await Promise.all(
      ((uploads || []) as DiagnosticUploadRecord[]).map(async (upload) => {
        const { data } = await supabase.storage.from(upload.storage_bucket).createSignedUrl(upload.storage_path, 3600);
        return { ...upload, download_url: data?.signedUrl || undefined };
      })
    );

    return json({
      case: diagnosticCase,
      messages: (messages || []) as DiagnosticMessageRecord[],
      uploads: uploadsWithUrls,
      recommendations,
      entitlements,
    });
  } catch (error) {
    return errorResponse(error, "The diagnostic case could not be loaded.");
  }
}

export async function PATCH(request: Request, { params }: RouteContext): Promise<Response> {
  try {
    const { caseId } = await params;
    const context = await requireActiveUser(request);
    const supabase = supabaseService();
    const existing = await loadCaseForUser(supabase, context, caseId);
    const input = updateCaseSchema.parse(await readJson(request));

    if (input.vehicle && existing.vehicle_id) {
      const vehicleUpdates = {
        ...(input.vehicle.make ? { make: input.vehicle.make } : {}),
        ...(input.vehicle.model ? { model: input.vehicle.model } : {}),
        ...(input.vehicle.year ? { year: input.vehicle.year } : {}),
        ...(input.vehicle.engine ? { engine: input.vehicle.engine } : {}),
        ...(input.vehicle.fuelType ? { fuel_type: input.vehicle.fuelType } : {}),
        ...(input.vehicle.gearbox ? { gearbox: input.vehicle.gearbox } : {}),
        ...(input.vehicle.vin !== undefined ? { vin: input.vehicle.vin || null } : {}),
        ...(input.vehicle.ecu !== undefined ? { ecu: input.vehicle.ecu || null } : {}),
      };
      if (Object.keys(vehicleUpdates).length) {
        const { error } = await supabase.from("vehicles").update(vehicleUpdates).eq("id", existing.vehicle_id).eq("owner_id", existing.owner_id);
        if (error) throw new HttpError(500, "Vehicle details could not be updated.");
      }
    }

    const caseUpdates = {
      ...(input.title ? { title: input.title } : {}),
      ...(input.status ? { status: input.status, closed_at: ["resolved", "archived"].includes(input.status) ? new Date().toISOString() : null } : {}),
      ...(input.priority ? { priority: input.priority } : {}),
      ...(input.symptoms ? { symptoms: input.symptoms } : {}),
      ...(input.dtcCodes ? { dtc_codes: input.dtcCodes } : {}),
      ...(input.previousWork !== undefined ? { previous_work: input.previousWork } : {}),
    };
    if (Object.keys(caseUpdates).length) {
      const { error } = await supabase.from("diagnostic_cases").update(caseUpdates).eq("id", caseId).eq("owner_id", existing.owner_id);
      if (error) throw new HttpError(500, error.message || "Case details could not be updated.");
    }
    const updated = await loadCaseForUser(supabase, context, caseId);
    return json({ case: updated, entitlements: await getEntitlements(supabase, context) });
  } catch (error) {
    return errorResponse(error, "The diagnostic case could not be updated.");
  }
}
