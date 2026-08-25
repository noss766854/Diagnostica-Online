import { HttpError } from "@/lib/platform/http";

export const ROUTERA_DEFAULT_BASE_URL = "https://api.routera.one/v1";
export const ROUTERA_DEFAULT_MODEL = "openai/gpt-5.5";

export type RouteraMessageContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } }
    >;

export interface RouteraMessage {
  role: "system" | "user" | "assistant";
  content: RouteraMessageContent;
}

interface RouteraCompletionInput {
  apiKey: string;
  baseUrl: string;
  model: string;
  messages: RouteraMessage[];
  timeoutMs?: number;
}

export interface RouteraCompletion {
  text: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface RouteraModel {
  id: string;
  ownedBy: string;
}

export async function createRouteraCompletion(input: RouteraCompletionInput): Promise<RouteraCompletion> {
  if (!isRouteraApiKey(input.apiKey)) {
    throw new HttpError(503, "The diagnostic service is not configured yet.");
  }

  const response = await routeraFetch(
    `${normalizeBaseUrl(input.baseUrl)}/chat/completions`,
    input.apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        stream: false,
      }),
    },
    input.timeoutMs ?? 90_000
  );
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new HttpError(response.status === 429 ? 503 : 502, "The diagnostic service is temporarily unavailable.");
  }

  const text = extractCompletionText(data);
  const usage = recordValue(data.usage);
  return {
    text,
    model: cleanModelId(data.model) || input.model,
    inputTokens: finiteNumber(usage.prompt_tokens),
    outputTokens: finiteNumber(usage.completion_tokens),
  };
}

export async function listRouteraModels(apiKey: string, baseUrl: string): Promise<RouteraModel[]> {
  if (!isRouteraApiKey(apiKey)) throw new HttpError(503, "ROUTERA_API_KEY is not configured correctly in Vercel.");
  const response = await routeraFetch(`${normalizeBaseUrl(baseUrl)}/models`, apiKey, { method: "GET" }, 15_000);
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new HttpError(502, "Routera's model catalog could not be loaded.");

  const models = Array.isArray(data.data) ? data.data : [];
  return models
    .map((item) => recordValue(item))
    .map((item) => ({
      id: cleanModelId(item.id),
      ownedBy: String(item.owned_by || item.provider || "").trim().slice(0, 100),
    }))
    .filter((item) => item.id)
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function cleanRouteraModel(value: unknown, fallback = ROUTERA_DEFAULT_MODEL): string {
  const model = cleanModelId(value);
  return model || fallback;
}

export function isRouteraApiKey(value: unknown): boolean {
  const key = String(value || "").trim();
  return key.startsWith("rta_") && key.length > 12;
}

function normalizeBaseUrl(value: string): string {
  try {
    const url = new URL(value || ROUTERA_DEFAULT_BASE_URL);
    if (url.protocol !== "https:") return ROUTERA_DEFAULT_BASE_URL;
    return url.toString().replace(/\/+$/, "");
  } catch {
    return ROUTERA_DEFAULT_BASE_URL;
  }
}

async function routeraFetch(
  url: string,
  apiKey: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        ...(init.headers || {}),
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new HttpError(504, "The diagnostic service took too long to respond. Please try again.");
    }
    throw new HttpError(502, "The diagnostic service could not be reached.");
  } finally {
    clearTimeout(timeout);
  }
}

function extractCompletionText(data: Record<string, unknown>): string {
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const message = recordValue(recordValue(choices[0]).message);
  if (typeof message.content === "string") return message.content.trim();
  if (!Array.isArray(message.content)) return "";
  return message.content
    .map((part) => recordValue(part))
    .map((part) => (part.type === "text" || part.type === "output_text" ? String(part.text || "") : ""))
    .join("")
    .trim();
}

function cleanModelId(value: unknown): string {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_./:-]/g, "")
    .slice(0, 200);
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function finiteNumber(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}
