import { z } from "zod";

import { requireAdmin } from "@/lib/platform/auth";
import { errorResponse, json, readJson } from "@/lib/platform/http";
import { canonicalSiteOrigin } from "@/lib/platform/site-url";
import {
  removeStripeCredential,
  resolveStripeCredentials,
  saveStripeCredential,
  type ServerCredential,
} from "@/lib/platform/secrets";
import { supabaseService } from "@/lib/platform/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const kindSchema = z.object({ kind: z.enum(["secretKey", "webhookSecret"]) }).strict();
const saveSchema = kindSchema.extend({ value: z.string().trim().min(1).max(500) });

export async function GET(request: Request): Promise<Response> {
  try {
    await requireAdmin(request);
    const result = await resolveStripeCredentials();
    return json({
      secretKey: publicCredential(result.secretKey),
      webhookSecret: publicCredential(result.webhookSecret),
      webhookUrl: `${canonicalSiteOrigin(request)}/api/webhooks/stripe`,
    });
  } catch (error) {
    return errorResponse(error, "Stripe credential status could not be loaded.");
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await requireAdmin(request);
    const body = saveSchema.parse(await readJson(request));
    const result = await saveStripeCredential(body.kind, body.value, context.user.id);
    await audit(context.user.id, "stripe_credential_updated", body.kind, result);
    return json(publicCredential(result));
  } catch (error) {
    return errorResponse(error, "The Stripe credential could not be saved.");
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const context = await requireAdmin(request);
    const body = kindSchema.parse(await readJson(request));
    const result = await removeStripeCredential(body.kind);
    await audit(context.user.id, "stripe_credential_removed", body.kind, result);
    return json(publicCredential(result));
  } catch (error) {
    return errorResponse(error, "The Stripe credential could not be removed.");
  }
}

function publicCredential(result: ServerCredential) {
  return { configured: result.configured, source: result.source, suffix: result.suffix };
}

async function audit(actorId: string, action: string, kind: string, result: ServerCredential): Promise<void> {
  try {
    await supabaseService().from("admin_audit_logs").insert({
      actor_id: actorId,
      action,
      target_table: "platform_secrets",
      metadata: { kind, source: result.source, suffix: result.suffix },
    });
  } catch {
    // An audit outage must not report a successfully saved credential as failed.
  }
}
