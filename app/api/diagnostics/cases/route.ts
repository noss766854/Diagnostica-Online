import { requireActiveUser } from "@/lib/platform/auth";
import { caseTitle, inferCasePriority } from "@/lib/platform/cases";
import { getEntitlements } from "@/lib/platform/entitlements";
import { errorResponse, HttpError, json, readJson } from "@/lib/platform/http";
import { supabaseService } from "@/lib/platform/supabase";
import { createCaseSchema } from "@/lib/platform/validation";
import type { DiagnosticCaseRecord, VehicleRecord } from "@/types/diagnostics";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const context = await requireActiveUser(request);
    const supabase = supabaseService();
    const [{ data, error }, entitlements] = await Promise.all([
      supabase
        .from("diagnostic_cases")
        .select("*,vehicle:vehicles(*)")
        .eq("owner_id", context.user.id)
        .order("updated_at", { ascending: false })
        .limit(50),
      getEntitlements(supabase, context),
    ]);
    if (error) throw new HttpError(500, "Saved diagnostic cases could not be loaded. Run the latest Supabase schema if this is a new deployment.");
    return json({ cases: (data || []) as DiagnosticCaseRecord[], entitlements });
  } catch (error) {
    return errorResponse(error, "Saved diagnostic cases could not be loaded.");
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requireActiveUser(request);
    const supabase = supabaseService();
    const entitlements = await getEntitlements(supabase, context);
    if (!entitlements.canCreateCase) {
      throw new HttpError(403, `Your ${entitlements.plan} plan allows ${entitlements.activeCaseLimit} active cases. Resolve or archive a case before creating another.`);
    }

    const input = createCaseSchema.parse(await readJson(request));
    const vehiclePayload = {
      owner_id: context.user.id,
      make: input.vehicle.make,
      model: input.vehicle.model,
      year: input.vehicle.year,
      engine: input.vehicle.engine,
      fuel_type: input.vehicle.fuelType,
      gearbox: input.vehicle.gearbox,
      vin: input.vehicle.vin || null,
      ecu: input.vehicle.ecu || null,
    };
    const { data: vehicle, error: vehicleError } = await supabase.from("vehicles").insert(vehiclePayload).select().single();
    if (vehicleError || !vehicle) throw new HttpError(500, vehicleError?.message || "The vehicle could not be saved.");

    const casePayload = {
      owner_id: context.user.id,
      vehicle_id: vehicle.id,
      title: caseTitle({
        title: input.title,
        year: input.vehicle.year,
        make: input.vehicle.make,
        model: input.vehicle.model,
        symptoms: input.symptoms,
      }),
      status: "active",
      priority: inferCasePriority(`${input.symptoms} ${input.previousWork}`),
      symptoms: input.symptoms,
      dtc_codes: input.dtcCodes,
      previous_work: input.previousWork,
      last_message_at: new Date().toISOString(),
    };
    const { data: diagnosticCase, error: caseError } = await supabase.from("diagnostic_cases").insert(casePayload).select().single();
    if (caseError || !diagnosticCase) {
      await supabase.from("vehicles").delete().eq("id", vehicle.id).eq("owner_id", context.user.id);
      const limitReached = /limit reached/i.test(caseError?.message || "");
      const limitMessage = limitReached ? "Your plan's active-case limit has been reached." : caseError?.message;
      throw new HttpError(limitReached ? 403 : 500, limitMessage || "The diagnostic case could not be saved.");
    }

    await supabase.from("usage_events").insert({
      user_id: context.user.id,
      case_id: diagnosticCase.id,
      event_type: "case_created",
      metadata: { source: "structured_case_form" },
    });
    const { data: setupMessage } = await supabase
      .from("diagnostic_messages")
      .insert({
        case_id: diagnosticCase.id,
        owner_id: context.user.id,
        sender_type: "system",
        content: "Case saved. Add the first question, observation, or test result and the diagnostic service will build a test plan.",
        metadata: { source: "case_setup" },
      })
      .select()
      .single();
    const refreshedEntitlements = await getEntitlements(supabase, context);
    return json(
      {
        case: { ...diagnosticCase, vehicle: vehicle as VehicleRecord } as DiagnosticCaseRecord,
        messages: setupMessage ? [setupMessage] : [],
        entitlements: refreshedEntitlements,
      },
      201
    );
  } catch (error) {
    return errorResponse(error, "The diagnostic case could not be created.");
  }
}
