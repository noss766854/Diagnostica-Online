import { ZodError } from "zod";
import { zodErrorMessage } from "@/lib/platform/validation";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function json(payload: unknown, status = 200): Response {
  return Response.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function errorResponse(error: unknown, fallback = "Request failed."): Response {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  if (error instanceof ZodError) return json({ error: zodErrorMessage(error) }, 400);
  const message = error instanceof Error ? safeError(error.message, fallback) : fallback;
  return json({ error: message }, 500);
}

export function safeError(message: unknown, fallback: string): string {
  const text = String(message || "")
    .replace(/[\r\n]+/g, " ")
    .trim();
  return text ? text.slice(0, 300) : fallback;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "The request body must be valid JSON.");
  }
}
