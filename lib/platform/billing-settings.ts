import type { SupabaseClient } from "@supabase/supabase-js";

export interface PremiumPlanConfig {
  key: string;
  label: string;
  description: string;
  displayPrice: string;
  interval: "month" | "year" | "custom";
  stripePriceId: string;
  active: boolean;
  featured: boolean;
}

export interface BillingSettings {
  freeAiMessagesPerDay: number;
  premiumAiMessagesPerDay: number;
  freeActiveCaseLimit: number;
  premiumActiveCaseLimit: number;
  premiumPlans: PremiumPlanConfig[];
}

const DEFAULT_FREE_AI_MESSAGES_PER_DAY = 10;
const DEFAULT_PREMIUM_AI_MESSAGES_PER_DAY = 100;
const DEFAULT_FREE_ACTIVE_CASE_LIMIT = 3;
const DEFAULT_PREMIUM_ACTIVE_CASE_LIMIT = 25;

export function defaultPremiumPlans(fallbackPriceId = ""): PremiumPlanConfig[] {
  return [
    {
      key: "monthly",
      label: "Premium Monthly",
      description: "Higher diagnostic limits, more saved active cases, and no ads.",
      displayPrice: "$19/month",
      interval: "month",
      stripePriceId: cleanStripePriceId(fallbackPriceId),
      active: true,
      featured: false,
    },
    {
      key: "yearly",
      label: "Premium Yearly",
      description: "Same Premium access with yearly billing.",
      displayPrice: "$149/year",
      interval: "year",
      stripePriceId: "",
      active: false,
      featured: true,
    },
  ];
}

export async function loadBillingSettings(supabase: SupabaseClient): Promise<BillingSettings> {
  let content: Record<string, unknown> = {};
  try {
    const { data, error } = await supabase.from("site_settings").select("value").eq("key", "public_content").maybeSingle();
    if (!error && data?.value && typeof data.value === "object" && !Array.isArray(data.value)) {
      content = data.value as Record<string, unknown>;
    }
  } catch {
    content = {};
  }
  return billingSettingsFromContent(content, process.env.STRIPE_PREMIUM_PRICE_ID || "");
}

export function billingSettingsFromContent(content: Record<string, unknown>, fallbackPriceId = ""): BillingSettings {
  const defaults = defaultPremiumPlans(fallbackPriceId);
  return {
    freeAiMessagesPerDay: integerInRange(content.freeAiMessagesPerDay, envInteger("FREE_AI_MESSAGES_PER_DAY", DEFAULT_FREE_AI_MESSAGES_PER_DAY), 1, 1000),
    premiumAiMessagesPerDay: integerInRange(
      content.premiumAiMessagesPerDay,
      envInteger("PREMIUM_AI_MESSAGES_PER_DAY", DEFAULT_PREMIUM_AI_MESSAGES_PER_DAY),
      1,
      10000
    ),
    freeActiveCaseLimit: integerInRange(content.freeActiveCaseLimit, DEFAULT_FREE_ACTIVE_CASE_LIMIT, 1, 100),
    premiumActiveCaseLimit: integerInRange(content.premiumActiveCaseLimit, DEFAULT_PREMIUM_ACTIVE_CASE_LIMIT, 1, 1000),
    premiumPlans: cleanPremiumPlans(content.premiumPlans, defaults),
  };
}

export function activePremiumPlans(settings: BillingSettings): PremiumPlanConfig[] {
  return settings.premiumPlans.filter((plan) => plan.active && Boolean(plan.stripePriceId));
}

export function selectPremiumPlan(settings: BillingSettings, requestedKey: unknown): PremiumPlanConfig | null {
  const active = activePremiumPlans(settings);
  if (!active.length) return null;
  const key = cleanPlanKey(requestedKey);
  return active.find((plan) => plan.key === key) || active[0] || null;
}

function cleanPremiumPlans(value: unknown, defaults: PremiumPlanConfig[]): PremiumPlanConfig[] {
  const source = Array.isArray(value) && value.length ? value : defaults;
  const plans = source
    .slice(0, 6)
    .map((plan, index) => cleanPremiumPlan(plan, defaults[index] || defaults[0], index))
    .filter((plan): plan is PremiumPlanConfig => Boolean(plan));
  return plans.length ? plans : defaults;
}

function cleanPremiumPlan(value: unknown, fallback: PremiumPlanConfig, index: number): PremiumPlanConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const record = value as Record<string, unknown>;
  const key = cleanPlanKey(record.key) || fallback.key || `plan-${index + 1}`;
  return {
    key,
    label: cleanText(record.label, fallback.label, 80),
    description: cleanText(record.description, fallback.description, 220),
    displayPrice: cleanText(record.displayPrice, fallback.displayPrice, 40),
    interval: cleanInterval(record.interval, fallback.interval),
    stripePriceId: cleanStripePriceId(record.stripePriceId) || fallback.stripePriceId,
    active: record.active !== false && record.active !== "false",
    featured: record.featured === true || record.featured === "true",
  };
}

function cleanInterval(value: unknown, fallback: PremiumPlanConfig["interval"]): PremiumPlanConfig["interval"] {
  const text = String(value || "").trim();
  return text === "month" || text === "year" || text === "custom" ? text : fallback;
}

function cleanStripePriceId(value: unknown): string {
  const text = String(value || "").trim();
  return /^price_[A-Za-z0-9_]{8,}$/.test(text) ? text : "";
}

function cleanPlanKey(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function cleanText(value: unknown, fallback: string, maxLength: number): string {
  const text = String(value || "").replace(/[\r\n]+/g, " ").trim().slice(0, maxLength);
  return text || fallback;
}

function integerInRange(value: unknown, fallback: number, min: number, max: number): number {
  const number = Number(value);
  if (!Number.isInteger(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function envInteger(name: string, fallback: number): number {
  const number = Number(process.env[name]);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}
