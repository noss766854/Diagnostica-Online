import { requireAdmin } from "@/lib/platform/auth";
import { serverEnvironment } from "@/lib/platform/env";
import { errorResponse, json } from "@/lib/platform/http";
import { listRouteraModels } from "@/lib/platform/routera";
import { resolveRouteraCredential } from "@/lib/platform/secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const env = serverEnvironment();
    const credential = await resolveRouteraCredential();
    const models = await listRouteraModels(credential.apiKey, env.routeraApiBaseUrl);
    return json({ models });
  } catch (error) {
    return errorResponse(error, "Routera's model catalog could not be loaded.");
  }
}
