import { requireAdmin } from "@/lib/platform/auth";
import { serverEnvironment } from "@/lib/platform/env";
import { errorResponse, json } from "@/lib/platform/http";
import { listRouteraModels } from "@/lib/platform/routera";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const env = serverEnvironment();
    const models = await listRouteraModels(env.routeraApiKey, env.routeraApiBaseUrl);
    return json({ models });
  } catch (error) {
    return errorResponse(error, "Routera's model catalog could not be loaded.");
  }
}
