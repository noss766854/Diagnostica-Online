export type ProfileRole = "customer" | "mechanic" | "admin";
export type PlanTier = "free" | "premium" | "admin";
export type PlanStatus = "active" | "trialing" | "past_due" | "canceled";
export type CaseStatus = "active" | "waiting_for_mechanic" | "assigned" | "resolved" | "archived";
export type CasePriority = "low" | "normal" | "urgent";
export type FuelType = "petrol" | "diesel" | "hybrid" | "electric" | "lpg" | "cng" | "other";
export type GearboxType = "manual" | "automatic" | "cvt" | "dct" | "single_speed" | "other";
export type MessageSender = "user" | "assistant" | "mechanic" | "system";
export type UploadKind = "image" | "pdf" | "text" | "csv" | "obd_scan" | "ecu_binary";
export type ToolCategory = "obd_scanner" | "multimeter" | "smoke_tester" | "vacuum_pump" | "repair_manual" | "scan_tool" | "other";
export type EscalationCategory = "none" | "ambiguous_evidence" | "specialist_judgment" | "unsupported_input" | "safety_review";

export interface VehicleRecord {
  id: string;
  owner_id: string;
  make: string;
  model: string;
  year: number;
  engine: string;
  fuel_type: FuelType;
  gearbox: GearboxType;
  vin: string | null;
  ecu: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiagnosticCaseRecord {
  id: string;
  owner_id: string;
  vehicle_id: string;
  title: string;
  status: CaseStatus;
  priority: CasePriority;
  symptoms: string;
  dtc_codes: string[];
  previous_work: string;
  ai_summary: string;
  assigned_mechanic_id: string | null;
  last_message_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  vehicle?: VehicleRecord;
}

export interface DiagnosticMessageRecord {
  id: string;
  case_id: string;
  owner_id: string;
  sender_type: MessageSender;
  content: string;
  provider: string | null;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DiagnosticUploadRecord {
  id: string;
  case_id: string;
  owner_id: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  upload_kind: UploadKind;
  analysis_status: "stored" | "queued" | "processed" | "unsupported" | "failed";
  created_at: string;
  download_url?: string;
}

export interface RecommendedToolRecord {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  affiliate_url: string;
  image_url: string | null;
  rule_tags: string[];
  dtc_prefixes: string[];
  priority: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Entitlements {
  plan: PlanTier;
  status: PlanStatus;
  isAdmin: boolean;
  isDisabled: boolean;
  showAds: boolean;
  aiMessagesUsedToday: number;
  aiMessagesDailyLimit: number | null;
  activeCases: number;
  activeCaseLimit: number | null;
  canSendAiMessage: boolean;
  canCreateCase: boolean;
}

export interface AiGenerationResult {
  text: string;
  provider: "gemini" | "openai";
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  escalation: {
    required: boolean;
    category: EscalationCategory;
    reason: string;
  };
}
