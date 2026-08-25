import { requireAdmin } from "@/lib/platform/auth";
import { errorResponse, json, readJson } from "@/lib/platform/http";
import { removeRouteraCredential, resolveRouteraCredential, saveRouteraCredential } from "@/lib/platform/secrets";
import { supabaseService } from "@/lib/platform/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    return json(publicCredential(await resolveRouteraCredential()));
  } catch (error) {
    return errorResponse(error, "The Routera credential status could not be loaded.");
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requireAdmin(request);
    const body = (await readJson(request)) as Record<string, unknown>;
    const result = await saveRouteraCredential(String(body.apiKey || ""), context.user.id);
    await audit(context.user.id, "routera_credential_updated", { source: "admin", suffix: result.suffix });
    return json(publicCredential(result));
  } catch (error) {
    return errorResponse(error, "The Routera credential could not be saved.");
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const context = await requireAdmin(request);
    const result = await removeRouteraCredential();
    await audit(context.user.id, "routera_credential_removed", { fallbackSource: result.source });
    return json(publicCredential(result));
  } catch (error) {
    return errorResponse(error, "The Routera credential could not be removed.");
  }
}

function publicCredential(result: Awaited<ReturnType<typeof resolveRouteraCredential>>) {
  return {
    configured: result.configured,
    source: result.source,
    suffix: result.suffix,
  };
}

async function audit(actorId: string, action: string, metadata: Record<string, unknown>): Promise<void> {
  try {
    await supabaseService().from("admin_audit_logs").insert({
      actor_id: actorId,
      action,
      target_table: "platform_secrets",
      target_id: null,
      metadata,
    });
  } catch {
    // Credential changes should not be reported as failed because audit logging is unavailable.
  }
}
