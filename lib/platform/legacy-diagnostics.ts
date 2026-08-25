import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

import type { AuthContext } from "@/lib/platform/auth";
import { HttpError } from "@/lib/platform/http";
import { createCaseSchema, normalizeDtcCodes, updateCaseSchema } from "@/lib/platform/validation";
import type {
  CasePriority,
  CaseStatus,
  DiagnosticCaseRecord,
  DiagnosticMessageRecord,
  FuelType,
  GearboxType,
  MessageSender,
  SupportedLanguage,
  VehicleRecord,
} from "@/types/diagnostics";

export const LEGACY_DIAGNOSTIC_SOURCE = "legacy_conversation";

type CreateCaseInput = z.infer<typeof createCaseSchema>;
type UpdateCaseInput = z.infer<typeof updateCaseSchema>;

export interface LegacyConversationRow {
  id: string;
  owner_id: string;
  session_id?: string | null;
  title: string;
  vehicle: Record<string, unknown>;
  messages: LegacyMessage[];
  brief: string;
  status?: string | null;
  priority?: string | null;
  assigned_mechanic_id?: string | null;
  last_customer_message_at?: string | null;
  last_staff_message_at?: string | null;
  closed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface LegacyMessage {
  id?: string;
  role?: string;
  name?: string;
  content?: string;
  createdAt?: string;
  created_at?: string;
  systemMessage?: boolean;
  technicianReply?: boolean;
  provider?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  metadata?: Record<string, unknown>;
  escalationRequired?: boolean;
  escalationCategory?: string;
  escalationReason?: string;
}

const CONVERSATION_SELECT =
  "id,owner_id,session_id,title,vehicle,messages,brief,created_at,updated_at";

export function isMissingDiagnosticSchema(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "");
  return /schema cache|does not exist|relation .* does not exist|public\.(vehicles|diagnostic_cases|diagnostic_messages|usage_events)|table 'public\.(vehicles|diagnostic_cases|diagnostic_messages|usage_events)'/i.test(
    message
  );
}

export function isLegacyDiagnosticCase(
  diagnosticCase: DiagnosticCaseRecord
): diagnosticCase is DiagnosticCaseRecord & { source: typeof LEGACY_DIAGNOSTIC_SOURCE } {
  return (diagnosticCase as { source?: string }).source === LEGACY_DIAGNOSTIC_SOURCE;
}

export async function listLegacyDiagnosticCases(supabase: SupabaseClient, ownerId: string): Promise<DiagnosticCaseRecord[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new HttpError(500, "Saved compatibility cases could not be loaded.");
  return ((data || []) as LegacyConversationRow[])
    .filter(isLegacyDiagnosticConversation)
    .map(conversationToDiagnosticCase);
}

export async function legacyActiveCaseCount(supabase: SupabaseClient, ownerId: string): Promise<number> {
  const cases = await listLegacyDiagnosticCases(supabase, ownerId);
  return cases.filter((diagnosticCase) => ["active", "waiting_for_mechanic", "assigned"].includes(diagnosticCase.status)).length;
}

export async function legacyAiMessageCountToday(supabase: SupabaseClient, ownerId: string, startIso: string): Promise<number> {
  const { data, error } = await supabase.from("conversations").select("vehicle,messages").eq("owner_id", ownerId).limit(100);
  if (error) return 0;
  const start = new Date(startIso).getTime();
  return ((data || []) as Array<{ vehicle: Record<string, unknown>; messages: LegacyMessage[] }>)
    .filter(isLegacyDiagnosticConversation)
    .flatMap((row) => (Array.isArray(row.messages) ? row.messages : []))
    .filter((message) => {
      const created = new Date(message.createdAt || message.created_at || 0).getTime();
      return created >= start && message.role === "assistant" && !message.systemMessage && Boolean(message.provider || message.model);
    }).length;
}

export async function createLegacyDiagnosticCase(
  supabase: SupabaseClient,
  context: AuthContext,
  input: CreateCaseInput
): Promise<{ case: DiagnosticCaseRecord; messages: DiagnosticMessageRecord[] }> {
  const now = new Date().toISOString();
  const title = caseTitle({
    title: input.title,
    year: input.vehicle.year,
    make: input.vehicle.make,
    model: input.vehicle.model,
    symptoms: input.symptoms,
  });
  const setup = legacyMessage({
    role: "assistant",
    content: caseSetupMessage(input.language),
    createdAt: now,
    systemMessage: true,
    metadata: { source: "case_setup", language: input.language, compatibility_storage: true },
  });
  const payload = {
    owner_id: context.user.id,
    session_id: `diagnostic-${randomUUID()}`,
    title,
    vehicle: legacyVehiclePayload(input, context.user.id),
    messages: [setup],
    brief: "",
    updated_at: now,
  };

  const { data, error } = await supabase.from("conversations").insert(payload).select(CONVERSATION_SELECT).single();
  if (error || !data) throw new HttpError(500, error?.message || "The compatibility case could not be saved.");
  const diagnosticCase = conversationToDiagnosticCase(data as LegacyConversationRow);
  return {
    case: diagnosticCase,
    messages: conversationMessagesToDiagnosticRecords(data as LegacyConversationRow),
  };
}

export async function loadLegacyDiagnosticCase(
  supabase: SupabaseClient,
  context: AuthContext,
  caseId: string
): Promise<DiagnosticCaseRecord> {
  const row = await loadLegacyConversation(supabase, context, caseId);
  return conversationToDiagnosticCase(row);
}

export async function loadLegacyDiagnosticMessages(
  supabase: SupabaseClient,
  context: AuthContext,
  caseId: string
): Promise<DiagnosticMessageRecord[]> {
  const row = await loadLegacyConversation(supabase, context, caseId);
  return conversationMessagesToDiagnosticRecords(row);
}

export async function updateLegacyDiagnosticCase(
  supabase: SupabaseClient,
  context: AuthContext,
  caseId: string,
  input: UpdateCaseInput
): Promise<DiagnosticCaseRecord> {
  const row = await loadLegacyConversation(supabase, context, caseId);
  const vehicle = { ...row.vehicle };
  const diagnostic = diagnosticPayload(vehicle);

  if (input.vehicle) {
    if (input.vehicle.year) vehicle.year = input.vehicle.year;
    if (input.vehicle.make) vehicle.make = input.vehicle.make;
    if (input.vehicle.model) vehicle.model = input.vehicle.model;
    if (input.vehicle.engine) vehicle.engine = input.vehicle.engine;
    if (input.vehicle.fuelType) vehicle.fuelType = input.vehicle.fuelType;
    if (input.vehicle.gearbox) vehicle.gearbox = input.vehicle.gearbox;
    if (input.vehicle.vin !== undefined) vehicle.vin = input.vehicle.vin || "";
    if (input.vehicle.ecu !== undefined) vehicle.ecu = input.vehicle.ecu || "";
  }
  if (input.symptoms) diagnostic.symptoms = input.symptoms;
  if (input.dtcCodes) diagnostic.dtcCodes = input.dtcCodes;
  if (input.previousWork !== undefined) diagnostic.previousWork = input.previousWork;
  if (input.status) diagnostic.status = input.status;
  if (input.priority) diagnostic.priority = input.priority;

  vehicle.diagnostic = diagnostic;
  vehicle.diagnosticPlatform = true;
  const updates = {
    ...(input.title ? { title: input.title } : {}),
    vehicle,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("conversations").update(updates).eq("id", row.id).select(CONVERSATION_SELECT).single();
  if (error || !data) throw new HttpError(500, error?.message || "The compatibility case could not be updated.");
  return conversationToDiagnosticCase(data as LegacyConversationRow);
}

export async function appendLegacyDiagnosticMessages(
  supabase: SupabaseClient,
  context: AuthContext,
  caseId: string,
  messages: LegacyMessage[],
  updates: { brief?: string; status?: CaseStatus; priority?: CasePriority } = {}
): Promise<{ row: LegacyConversationRow; records: DiagnosticMessageRecord[] }> {
  const row = await loadLegacyConversation(supabase, context, caseId);
  const existing = Array.isArray(row.messages) ? row.messages : [];
  const now = new Date().toISOString();
  const nextMessages = [...existing, ...messages];
  const vehicle = { ...row.vehicle };
  const diagnostic = diagnosticPayload(vehicle);
  if (updates.status) diagnostic.status = updates.status;
  if (updates.priority) diagnostic.priority = updates.priority;
  vehicle.diagnostic = diagnostic;
  vehicle.diagnosticPlatform = true;
  const payload = {
    messages: nextMessages,
    vehicle,
    ...(updates.brief !== undefined ? { brief: updates.brief } : {}),
    updated_at: now,
  };
  const { data, error } = await supabase.from("conversations").update(payload).eq("id", row.id).select(CONVERSATION_SELECT).single();
  if (error || !data) throw new HttpError(500, error?.message || "The compatibility case messages could not be saved.");
  return {
    row: data as LegacyConversationRow,
    records: messages.map((message) => legacyMessageToDiagnosticRecord(message, data as LegacyConversationRow)),
  };
}

export function legacyMessage(input: LegacyMessage): LegacyMessage {
  return {
    id: input.id || randomUUID(),
    role: input.role || "assistant",
    name: input.name || "",
    content: String(input.content || "").trim(),
    createdAt: input.createdAt || new Date().toISOString(),
    systemMessage: input.systemMessage === true,
    technicianReply: input.technicianReply === true,
    provider: input.provider || "",
    model: input.model || "",
    inputTokens: Number(input.inputTokens || 0),
    outputTokens: Number(input.outputTokens || 0),
    metadata: input.metadata || {},
    escalationRequired: input.escalationRequired === true,
    escalationCategory: input.escalationCategory || "none",
    escalationReason: input.escalationReason || "",
  };
}

export function conversationMessagesToDiagnosticRecords(row: LegacyConversationRow): DiagnosticMessageRecord[] {
  return (Array.isArray(row.messages) ? row.messages : []).map((message) => legacyMessageToDiagnosticRecord(message, row));
}

async function loadLegacyConversation(supabase: SupabaseClient, context: AuthContext, caseId: string): Promise<LegacyConversationRow> {
  const { data, error } = await supabase.from("conversations").select(CONVERSATION_SELECT).eq("id", caseId).maybeSingle();
  if (error) throw new HttpError(500, "The compatibility case could not be loaded.");
  if (!data) throw new HttpError(404, "Diagnostic case not found.");
  const row = data as LegacyConversationRow;
  if (row.owner_id !== context.user.id && context.profile.role !== "admin") {
    throw new HttpError(403, "You do not have access to this diagnostic case.");
  }
  if (!isLegacyDiagnosticConversation(row)) throw new HttpError(404, "Diagnostic case not found.");
  return row;
}

function conversationToDiagnosticCase(row: LegacyConversationRow): DiagnosticCaseRecord & { source: typeof LEGACY_DIAGNOSTIC_SOURCE } {
  const vehicle = row.vehicle || {};
  const diagnostic = diagnosticPayload(vehicle);
  const diagnosticStatus = String(diagnostic.status || row.status || "active");
  const diagnosticPriority = diagnostic.priority || row.priority || "normal";
  return {
    id: row.id,
    owner_id: row.owner_id,
    vehicle_id: row.id,
    title: row.title || "Diagnostic case",
    status: conversationToDiagnosticStatus(diagnosticStatus),
    priority: priority(diagnosticPriority),
    symptoms: String(diagnostic.symptoms || ""),
    dtc_codes: normalizeDtcCodes(diagnostic.dtcCodes),
    previous_work: String(diagnostic.previousWork || ""),
    ai_summary: row.brief || "",
    assigned_mechanic_id: row.assigned_mechanic_id || null,
    last_message_at: row.updated_at || row.last_customer_message_at || row.created_at,
    closed_at: row.closed_at || (diagnosticStatus === "archived" ? row.updated_at : null),
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || row.created_at || new Date().toISOString(),
    vehicle: vehicleRecord(row),
    source: LEGACY_DIAGNOSTIC_SOURCE,
  };
}

function vehicleRecord(row: LegacyConversationRow): VehicleRecord {
  const vehicle = row.vehicle || {};
  return {
    id: row.id,
    owner_id: row.owner_id,
    make: String(vehicle.make || ""),
    model: String(vehicle.model || ""),
    year: Number(vehicle.year || 0),
    engine: String(vehicle.engine || vehicle.powertrain || ""),
    fuel_type: fuelType(vehicle.fuelType || vehicle.fuel_type),
    gearbox: gearbox(vehicle.gearbox),
    vin: optionalString(vehicle.vin),
    ecu: optionalString(vehicle.ecu),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function legacyVehiclePayload(input: CreateCaseInput, ownerId: string): Record<string, unknown> {
  return {
    diagnosticPlatform: true,
    ownerId,
    year: input.vehicle.year,
    make: input.vehicle.make,
    model: input.vehicle.model,
    engine: input.vehicle.engine,
    fuelType: input.vehicle.fuelType,
    gearbox: input.vehicle.gearbox,
    vin: input.vehicle.vin || "",
    ecu: input.vehicle.ecu || "",
    category: input.dtcCodes.length ? "Fault-code diagnosis" : "Symptom diagnosis",
    diagnostic: {
      symptoms: input.symptoms,
      dtcCodes: input.dtcCodes,
      previousWork: input.previousWork,
      language: input.language,
      status: "active",
      priority: inferCasePriority(`${input.symptoms} ${input.previousWork}`),
    },
  };
}

function legacyMessageToDiagnosticRecord(message: LegacyMessage, row: LegacyConversationRow): DiagnosticMessageRecord {
  const metadata = message.metadata && typeof message.metadata === "object" ? message.metadata : {};
  return {
    id: message.id || randomUUID(),
    case_id: row.id,
    owner_id: row.owner_id,
    sender_type: senderType(message),
    content: String(message.content || ""),
    provider: message.provider || null,
    model: message.model || null,
    input_tokens: Number(message.inputTokens || 0),
    output_tokens: Number(message.outputTokens || 0),
    metadata: {
      ...metadata,
      compatibility_storage: true,
      escalation_required: message.escalationRequired === true || metadata.escalation_required === true,
      escalation_category: message.escalationCategory || metadata.escalation_category || "none",
      escalation_reason: message.escalationReason || metadata.escalation_reason || "",
    },
    created_at: message.createdAt || message.created_at || row.updated_at || new Date().toISOString(),
  };
}

function isLegacyDiagnosticConversation(row: { vehicle?: unknown }): boolean {
  const vehicle = row.vehicle;
  if (!vehicle || typeof vehicle !== "object" || Array.isArray(vehicle)) return false;
  const record = vehicle as Record<string, unknown>;
  return record.diagnosticPlatform === true || record.diagnostic_platform === true;
}

function diagnosticPayload(vehicle: Record<string, unknown>): Record<string, unknown> {
  const diagnostic = vehicle.diagnostic;
  return diagnostic && typeof diagnostic === "object" && !Array.isArray(diagnostic) ? (diagnostic as Record<string, unknown>) : {};
}

function caseSetupMessage(language: SupportedLanguage): string {
  const messages: Record<SupportedLanguage, string> = {
    en: "Case saved. Add the first question, observation, or test result and the diagnostic service will build a test plan.",
    es: "Caso guardado. Añade la primera pregunta, observación o resultado de una prueba y el servicio creará un plan de diagnóstico.",
    ro: "Caz salvat. Adaugă prima întrebare, observație sau rezultat al unui test, iar serviciul va construi un plan de diagnostic.",
    "ca-valencia": "Cas guardat. Afig la primera pregunta, observació o resultat d'una prova i el servici crearà un pla de diagnòstic.",
  };
  return messages[language] || messages.en;
}

function conversationToDiagnosticStatus(status: string): CaseStatus {
  if (status === "waiting_for_mechanic") return "waiting_for_mechanic";
  if (status === "assigned") return "assigned";
  if (status === "closed") return "archived";
  if (status === "answered") return "resolved";
  return "active";
}

function senderType(message: LegacyMessage): MessageSender {
  if (message.role === "user") return "user";
  if (message.technicianReply) return "mechanic";
  if (message.systemMessage) return "system";
  return "assistant";
}

function fuelType(value: unknown): FuelType {
  return ["petrol", "diesel", "hybrid", "electric", "lpg", "cng", "other"].includes(String(value)) ? (value as FuelType) : "other";
}

function gearbox(value: unknown): GearboxType {
  return ["manual", "automatic", "cvt", "dct", "single_speed", "other"].includes(String(value)) ? (value as GearboxType) : "other";
}

function priority(value: unknown): CasePriority {
  return value === "low" || value === "urgent" ? value : "normal";
}

function optionalString(value: unknown): string | null {
  const text = String(value || "").trim();
  return text || null;
}

function inferCasePriority(text: string): "normal" | "urgent" {
  return /brake loss|no brakes|fuel leak|fuel smell|smoke|fire|oil pressure|steering loss|severe overheat|high voltage|battery fire/i.test(text)
    ? "urgent"
    : "normal";
}

function caseTitle(input: {
  title?: string;
  year: number;
  make: string;
  model: string;
  symptoms: string;
}): string {
  if (input.title?.trim()) return input.title.trim();
  const symptom = input.symptoms.replace(/\s+/g, " ").trim().slice(0, 70);
  return `${input.year} ${input.make} ${input.model}: ${symptom}`.slice(0, 140);
}
