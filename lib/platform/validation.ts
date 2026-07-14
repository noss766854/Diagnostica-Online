import { z } from "zod";
import type { UploadKind } from "@/types/diagnostics";

export const supportedLanguageSchema = z.enum(["en", "es", "ro", "ca-valencia"]);

const optionalTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .default("");

const dtcCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9]{3,9}$/, "Use a valid diagnostic code such as P0300, U0100, or 00532.");

export const vehicleInputSchema = z.object({
  make: z.string().trim().min(1, "Vehicle make is required.").max(80),
  model: z.string().trim().min(1, "Vehicle model is required.").max(100),
  year: z.coerce.number().int().min(1886).max(new Date().getFullYear() + 2),
  engine: z.string().trim().min(1, "Engine or powertrain is required.").max(120),
  fuelType: z.enum(["petrol", "diesel", "hybrid", "electric", "lpg", "cng", "other"]),
  gearbox: z.enum(["manual", "automatic", "cvt", "dct", "single_speed", "other"]),
  vin: z
    .string()
    .trim()
    .toUpperCase()
    .max(17)
    .refine((value) => !value || /^[A-HJ-NPR-Z0-9]{11,17}$/.test(value), "VIN must contain 11-17 valid VIN characters.")
    .optional()
    .default(""),
  ecu: optionalTrimmed(120),
});

export const createCaseSchema = z.object({
  title: z.string().trim().min(3).max(140).optional(),
  vehicle: vehicleInputSchema,
  symptoms: z.string().trim().min(10, "Describe the symptoms in at least 10 characters.").max(6000),
  dtcCodes: z.array(dtcCode).max(30).optional().default([]),
  previousWork: optionalTrimmed(5000),
  language: supportedLanguageSchema.optional().default("en"),
});

export const updateCaseSchema = z.object({
  title: z.string().trim().min(3).max(140).optional(),
  status: z.enum(["active", "waiting_for_mechanic", "assigned", "resolved", "archived"]).optional(),
  priority: z.enum(["low", "normal", "urgent"]).optional(),
  symptoms: z.string().trim().min(10).max(6000).optional(),
  dtcCodes: z.array(dtcCode).max(30).optional(),
  previousWork: z.string().trim().max(5000).optional(),
  vehicle: vehicleInputSchema.partial().optional(),
});

export const diagnosticMessageSchema = z.object({
  content: z.string().trim().min(2, "Enter a diagnostic question or test result.").max(5000),
  language: supportedLanguageSchema.optional().default("en"),
});

export const accountPreferencesSchema = z.object({
  language: supportedLanguageSchema,
});

export const uploadSignSchema = z.object({
  action: z.literal("sign"),
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.string().trim().min(1).max(160),
  sizeBytes: z.coerce.number().int().positive().max(52_428_800),
});

export const uploadCompleteSchema = z.object({
  action: z.literal("complete"),
  storagePath: z.string().trim().min(10).max(500),
  fileName: z.string().trim().min(1).max(180),
  mimeType: z.string().trim().min(1).max(160),
  sizeBytes: z.coerce.number().int().positive().max(52_428_800),
  uploadKind: z.enum(["image", "pdf", "text", "csv", "obd_scan", "ecu_binary"]),
});

export const uploadRequestSchema = z.discriminatedUnion("action", [uploadSignSchema, uploadCompleteSchema]);

export const adminPlatformActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_user"),
    userId: z.string().uuid(),
    role: z.enum(["customer", "mechanic", "admin"]),
    planTier: z.enum(["free", "premium", "admin"]),
    planStatus: z.enum(["active", "trialing", "past_due", "canceled"]),
    isDisabled: z.boolean(),
    disabledReason: z.string().trim().max(500).optional().default(""),
  }),
  z.object({
    action: z.literal("upsert_tool"),
    toolId: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(120),
    category: z.enum(["obd_scanner", "multimeter", "smoke_tester", "vacuum_pump", "repair_manual", "scan_tool", "other"]),
    description: z.string().trim().min(5).max(1000),
    affiliateUrl: z.string().url().max(1000).refine((value) => value.startsWith("https://"), "Affiliate links must use HTTPS."),
    imageUrl: z.union([z.string().url().max(1000), z.literal("")]).optional().default(""),
    ruleTags: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
    dtcPrefixes: z.array(z.string().trim().toUpperCase().min(1).max(8)).max(30).default([]),
    priority: z.coerce.number().int().min(0).max(1000).default(100),
    active: z.boolean().default(true),
  }),
  z.object({
    action: z.literal("update_case"),
    caseId: z.string().uuid(),
    status: z.enum(["active", "waiting_for_mechanic", "assigned", "resolved", "archived"]),
    priority: z.enum(["low", "normal", "urgent"]),
    assignedMechanicId: z.union([z.string().uuid(), z.literal(""), z.null()]).optional(),
    reply: z.string().trim().max(5000).optional().default(""),
  }),
  z.object({
    action: z.literal("disable_tool"),
    toolId: z.string().uuid(),
  }),
]);

const imageExtensions = new Set(["jpg", "jpeg", "png", "webp", "heic"]);
const textExtensions = new Set(["txt", "log"]);
const obdExtensions = new Set(["obd", "vcds", "odis"]);
const ecuExtensions = new Set(["bin", "hex", "ori", "frf", "sgo", "odx", "odx-f"]);

export function uploadKindFor(fileName: string, mimeType: string): UploadKind | null {
  const extension = fileName.toLowerCase().split(".").pop() || "";
  const mime = mimeType.toLowerCase();
  if (mime.startsWith("image/") || imageExtensions.has(extension)) return "image";
  if (mime === "application/pdf" || extension === "pdf") return "pdf";
  if (mime === "text/csv" || extension === "csv") return "csv";
  if (textExtensions.has(extension) || mime.startsWith("text/plain")) return "text";
  if (obdExtensions.has(extension)) return "obd_scan";
  if (ecuExtensions.has(extension)) return "ecu_binary";
  return null;
}

export function normalizeDtcCodes(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : String(value || "").split(/[\s,;]+/);
  return Array.from(
    new Set(
      raw
        .map((item) => String(item).trim().toUpperCase())
        .filter(Boolean)
    )
  );
}

export function safeFileName(value: string): string {
  const cleaned = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 140);
  return cleaned || "diagnostic-file";
}

export function zodErrorMessage(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join(" ").slice(0, 400);
}
