import { createHash } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { serverEnvironment } from "@/lib/platform/env";
import type { DiagnosticUploadRecord, UploadKind } from "@/types/diagnostics";

const MAX_EXTRACTED_TEXT = 60_000;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 15 * 1024 * 1024;

export interface DiagnosticAttachment {
  name: string;
  mimeType: string;
  kind: UploadKind;
  sha256: string | null;
  text?: string;
  base64?: string;
}

export async function processStoredUpload(
  supabase: SupabaseClient,
  upload: DiagnosticUploadRecord
): Promise<DiagnosticUploadRecord> {
  try {
    const bytes = await downloadBytes(supabase, upload);
    if (!bytes.length || bytes.length > serverEnvironment().maxUploadBytes) throw new Error("Stored file size is outside the configured upload limit.");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const update: Record<string, unknown> = {
      sha256,
      analyzed_at: new Date().toISOString(),
      analysis_error: null,
    };

    if (["text", "csv", "obd_scan"].includes(upload.upload_kind)) {
      const text = decodeDiagnosticText(bytes);
      if (!text) throw new Error("The uploaded scan or log does not contain readable text.");
      update.extracted_text = text;
      update.analysis_status = "processed";
      update.analysis_summary = `Parsed ${text.length.toLocaleString("en-US")} characters for diagnostic context. SHA-256 ${sha256.slice(0, 12)}...`;
    } else if (upload.upload_kind === "image") {
      if (!isSupportedImage(upload.mime_type)) throw new Error("This image format is stored, but the diagnostic model requires JPEG, PNG, GIF, or WebP.");
      update.analysis_status = "processed";
      update.analysis_summary = `Ready for visual inspection in this case. SHA-256 ${sha256.slice(0, 12)}...`;
    } else if (upload.upload_kind === "pdf") {
      update.analysis_status = "processed";
      update.analysis_summary = `Ready for document inspection in this case. SHA-256 ${sha256.slice(0, 12)}...`;
    } else {
      update.analysis_status = "unsupported";
      update.analysis_summary = `Stored without binary analysis. Integrity hash: SHA-256 ${sha256}.`;
    }

    const { data, error } = await supabase.from("diagnostic_uploads").update(update).eq("id", upload.id).select().single();
    if (error || !data) throw new Error(error?.message || "Upload processing results could not be saved.");
    return data as DiagnosticUploadRecord;
  } catch (error) {
    const message = safeProcessingError(error);
    const { data } = await supabase
      .from("diagnostic_uploads")
      .update({ analysis_status: "failed", analysis_error: message, analyzed_at: new Date().toISOString() })
      .eq("id", upload.id)
      .select()
      .maybeSingle();
    return (data || { ...upload, analysis_status: "failed", analysis_error: message }) as DiagnosticUploadRecord;
  }
}

export async function loadDiagnosticAttachments(supabase: SupabaseClient, caseId: string): Promise<DiagnosticAttachment[]> {
  const { data } = await supabase
    .from("diagnostic_uploads")
    .select("*")
    .eq("case_id", caseId)
    .in("analysis_status", ["processed", "unsupported"])
    .order("created_at", { ascending: false })
    .limit(12);
  const uploads = (data || []) as DiagnosticUploadRecord[];
  const attachments: DiagnosticAttachment[] = [];
  let binaryBytes = 0;

  for (const upload of uploads.reverse()) {
    if (upload.extracted_text) {
      attachments.push({
        name: upload.file_name,
        mimeType: upload.mime_type,
        kind: upload.upload_kind,
        sha256: upload.sha256,
        text: upload.extracted_text.slice(0, MAX_EXTRACTED_TEXT),
      });
      continue;
    }
    const attachable = upload.upload_kind === "pdf" || (upload.upload_kind === "image" && isSupportedImage(upload.mime_type));
    if (!attachable || upload.size_bytes > MAX_ATTACHMENT_BYTES || binaryBytes + upload.size_bytes > MAX_TOTAL_ATTACHMENT_BYTES) continue;
    try {
      const bytes = await downloadBytes(supabase, upload);
      if (bytes.length > MAX_ATTACHMENT_BYTES || binaryBytes + bytes.length > MAX_TOTAL_ATTACHMENT_BYTES) continue;
      binaryBytes += bytes.length;
      attachments.push({
        name: upload.file_name,
        mimeType: upload.mime_type || (upload.upload_kind === "pdf" ? "application/pdf" : "image/jpeg"),
        kind: upload.upload_kind,
        sha256: upload.sha256,
        base64: bytes.toString("base64"),
      });
    } catch {
      // A missing attachment should not block the rest of the diagnostic conversation.
    }
  }
  return attachments;
}

async function downloadBytes(supabase: SupabaseClient, upload: Pick<DiagnosticUploadRecord, "storage_bucket" | "storage_path">): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(upload.storage_bucket).download(upload.storage_path);
  if (error || !data) throw new Error(error?.message || "Stored file could not be read.");
  return Buffer.from(await data.arrayBuffer());
}

function decodeDiagnosticText(bytes: Buffer): string {
  const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  const nullRatio = (decoded.match(/\u0000/g)?.length || 0) / Math.max(decoded.length, 1);
  if (nullRatio > 0.01) return "";
  return decoded
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, MAX_EXTRACTED_TEXT);
}

function isSupportedImage(mimeType: string): boolean {
  return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(String(mimeType || "").toLowerCase());
}

function safeProcessingError(error: unknown): string {
  return (error instanceof Error ? error.message : "File processing failed.").replace(/[\r\n]+/g, " ").slice(0, 500);
}
