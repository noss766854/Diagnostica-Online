export interface ServerEnvironment {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  aiProvider: "gemini" | "openai";
  geminiApiKey: string;
  geminiModel: string;
  geminiApiBaseUrl: string;
  openAiApiKey: string;
  openAiModel: string;
  freeAiMessagesPerDay: number;
  premiumAiMessagesPerDay: number;
  maxUploadBytes: number;
  aiInputCostPerMillion: number;
  aiOutputCostPerMillion: number;
}

let cachedEnvironment: ServerEnvironment | null = null;

export function serverEnvironment(): ServerEnvironment {
  if (cachedEnvironment) return cachedEnvironment;
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured on the server.");
  }

  const requestedProvider = process.env.AI_PROVIDER === "openai" ? "openai" : "gemini";
  const maxUploadMb = positiveInteger(process.env.MAX_DIAGNOSTIC_UPLOAD_MB, 25);
  cachedEnvironment = {
    supabaseUrl,
    supabaseServiceRoleKey,
    aiProvider: requestedProvider,
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    geminiModel: process.env.GEMINI_MODEL || process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.5-flash",
    geminiApiBaseUrl: secureBaseUrl(process.env.GEMINI_API_BASE_URL, "https://generativelanguage.googleapis.com"),
    openAiApiKey: process.env.OPENAI_API_KEY || "",
    openAiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    freeAiMessagesPerDay: Math.max(10, positiveInteger(process.env.FREE_AI_MESSAGES_PER_DAY, 10)),
    premiumAiMessagesPerDay: positiveInteger(process.env.PREMIUM_AI_MESSAGES_PER_DAY, 100),
    maxUploadBytes: Math.min(maxUploadMb, 50) * 1024 * 1024,
    aiInputCostPerMillion: nonNegativeNumber(process.env.AI_INPUT_COST_PER_MILLION, 0),
    aiOutputCostPerMillion: nonNegativeNumber(process.env.AI_OUTPUT_COST_PER_MILLION, 0),
  };
  return cachedEnvironment;
}

function nonNegativeNumber(value: string | undefined, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function secureBaseUrl(value: string | undefined, fallback: string): string {
  try {
    const url = new URL(value || fallback);
    return url.protocol === "https:" ? url.toString().replace(/\/+$/, "") : fallback;
  } catch {
    return fallback;
  }
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}
