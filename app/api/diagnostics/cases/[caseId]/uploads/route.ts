import { requireActiveUser } from "@/lib/platform/auth";
import { loadCaseForUser } from "@/lib/platform/cases";
import { serverEnvironment } from "@/lib/platform/env";
import { errorResponse, HttpError, json, readJson } from "@/lib/platform/http";
import { isLegacyDiagnosticCase } from "@/lib/platform/legacy-diagnostics";
import { supabaseService } from "@/lib/platform/supabase";
import { processStoredUpload } from "@/lib/platform/uploads";
import { safeFileName, uploadKindFor, uploadRequestSchema } from "@/lib/platform/validation";
import type { DiagnosticUploadRecord } from "@/types/diagnostics";

export const runtime = "nodejs";

const BUCKET = "diagnostic-uploads";

interface RouteContext {
  params: Promise<{ caseId: string }>;
}

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  try {
    const { caseId } = await params;
    const context = await requireActiveUser(request);
    const supabase = supabaseService();
    const diagnosticCase = await loadCaseForUser(supabase, context, caseId);
    if (isLegacyDiagnosticCase(diagnosticCase)) return json({ uploads: [] });
    const { data, error } = await supabase.from("diagnostic_uploads").select("*").eq("case_id", caseId).order("created_at", { ascending: false });
    if (error) throw new HttpError(500, "Uploaded file metadata could not be loaded.");
    const uploads = await Promise.all(
      ((data || []) as DiagnosticUploadRecord[]).map(async (upload) => {
        const { data: signed } = await supabase.storage.from(upload.storage_bucket).createSignedUrl(upload.storage_path, 3600);
        return { ...upload, download_url: signed?.signedUrl || undefined };
      })
    );
    return json({ uploads });
  } catch (error) {
    return errorResponse(error, "Uploaded files could not be loaded.");
  }
}

export async function POST(request: Request, { params }: RouteContext): Promise<Response> {
  try {
    const { caseId } = await params;
    const context = await requireActiveUser(request);
    const supabase = supabaseService();
    const diagnosticCase = await loadCaseForUser(supabase, context, caseId);
    if (isLegacyDiagnosticCase(diagnosticCase)) {
      throw new HttpError(409, "File uploads require the full diagnostic upload schema. Chat and saved cases still work on this deployment.");
    }
    const input = uploadRequestSchema.parse(await readJson(request));

    if (input.action === "sign") {
      const env = serverEnvironment();
      if (input.sizeBytes > env.maxUploadBytes) {
        throw new HttpError(413, `Files are limited to ${Math.round(env.maxUploadBytes / 1024 / 1024)} MB.`);
      }
      const uploadKind = uploadKindFor(input.fileName, input.mimeType);
      if (!uploadKind) {
        throw new HttpError(415, "Supported uploads are images, PDF reports, TXT/CSV logs, OBD/VCDS/ODIS scans, and recognized ECU binary formats.");
      }
      const storagePath = `${context.user.id}/${caseId}/${crypto.randomUUID()}-${safeFileName(input.fileName)}`;
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(storagePath, { upsert: false });
      if (error || !data) throw new HttpError(500, error?.message || "A secure upload URL could not be created.");
      return json({
        bucket: BUCKET,
        storagePath,
        signedUrl: data.signedUrl,
        token: data.token,
        uploadKind,
      });
    }

    const expectedPrefix = `${context.user.id}/${caseId}/`;
    if (!input.storagePath.startsWith(expectedPrefix)) throw new HttpError(403, "The uploaded file path does not belong to this case.");
    const detectedKind = uploadKindFor(input.fileName, input.mimeType);
    if (!detectedKind || detectedKind !== input.uploadKind) throw new HttpError(415, "The uploaded file type could not be verified.");

    const fileNameInBucket = input.storagePath.split("/").pop() || "";
    const folder = input.storagePath.slice(0, -(fileNameInBucket.length + 1));
    const { data: storedObjects, error: storageError } = await supabase.storage.from(BUCKET).list(folder, { search: fileNameInBucket, limit: 2 });
    if (storageError || !storedObjects?.some((item) => item.name === fileNameInBucket)) {
      throw new HttpError(400, "The file has not finished uploading to Supabase Storage.");
    }

    const { data: upload, error: metadataError } = await supabase
      .from("diagnostic_uploads")
      .insert({
        case_id: caseId,
        owner_id: context.user.id,
        storage_bucket: BUCKET,
        storage_path: input.storagePath,
        file_name: input.fileName,
        mime_type: input.mimeType,
        size_bytes: input.sizeBytes,
        upload_kind: input.uploadKind,
        analysis_status: "queued",
      })
      .select()
      .single();
    if (metadataError || !upload) throw new HttpError(500, metadataError?.message || "Upload metadata could not be saved.");

    await supabase.from("usage_events").insert({
      user_id: context.user.id,
      case_id: caseId,
      event_type: "upload",
      metadata: { upload_kind: input.uploadKind, size_bytes: input.sizeBytes },
    });
    const processedUpload = await processStoredUpload(supabase, upload as DiagnosticUploadRecord);
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(input.storagePath, 3600);
    return json({ upload: { ...processedUpload, download_url: signed?.signedUrl || undefined } as DiagnosticUploadRecord }, 201);
  } catch (error) {
    return errorResponse(error, "The diagnostic file could not be uploaded.");
  }
}

export async function DELETE(request: Request, { params }: RouteContext): Promise<Response> {
  try {
    const { caseId } = await params;
    const context = await requireActiveUser(request);
    const supabase = supabaseService();
    const diagnosticCase = await loadCaseForUser(supabase, context, caseId);
    if (isLegacyDiagnosticCase(diagnosticCase)) {
      throw new HttpError(409, "File uploads require the full diagnostic upload schema.");
    }
    const uploadId = new URL(request.url).searchParams.get("uploadId") || "";
    if (!/^[0-9a-f-]{36}$/i.test(uploadId)) throw new HttpError(400, "A valid upload ID is required.");
    const { data: upload, error } = await supabase
      .from("diagnostic_uploads")
      .select("id,storage_bucket,storage_path")
      .eq("id", uploadId)
      .eq("case_id", caseId)
      .eq("owner_id", context.user.id)
      .maybeSingle();
    if (error || !upload) throw new HttpError(404, "Upload not found.");
    await supabase.storage.from(upload.storage_bucket).remove([upload.storage_path]);
    const { error: deleteError } = await supabase.from("diagnostic_uploads").delete().eq("id", upload.id).eq("owner_id", context.user.id);
    if (deleteError) throw new HttpError(500, "Upload metadata could not be deleted.");
    return json({ ok: true });
  } catch (error) {
    return errorResponse(error, "The diagnostic upload could not be deleted.");
  }
}
