"use server";

import { revalidatePath } from "next/cache";
import { requirePermission, requireProfile } from "./_helpers";

const BUCKET = "documents-pdf";

/**
 * Uploads a PDF file to storage and links it to a document.
 *
 * FormData fields:
 *   - file        : the PDF binary (required)
 *   - pageCount   : numeric, optional. Caller can pre-count pages with pdf.js
 *                   client-side and forward; server stores as-is.
 *
 * The bucket path is `<documentId>.pdf` (one file per doc, replaceable).
 */
export async function uploadPdfAction(
  documentId: string,
  formData: FormData,
) {
  const { supabase, profileId, role } = await requireProfile();
  requirePermission(role, "edit");

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("missing file");
  if (file.type && file.type !== "application/pdf") {
    throw new Error(`expected application/pdf, got ${file.type}`);
  }

  const pageCountRaw = formData.get("pageCount");
  const pageCount =
    typeof pageCountRaw === "string" && pageCountRaw.trim() !== ""
      ? Number(pageCountRaw)
      : null;

  const path = `${documentId}.pdf`;
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: "application/pdf", upsert: true });
  if (uploadErr) throw uploadErr;

  // Intentionally NOT setting pdf_title from file.name — multipart FormData
  // mangles non-ASCII filenames (UTF-8 → Latin-1) depending on the browser,
  // and we have no reliable way to detect the original encoding server-side.
  // The viewer falls back to the document's label, which is always correct.
  const { error: updErr } = await supabase
    .from("document_content")
    .upsert(
      {
        document_id: documentId,
        pdf_storage_path: path,
        author_id: profileId,
        ...(pageCount && Number.isFinite(pageCount) ? { pdf_pages: pageCount } : {}),
      },
      { onConflict: "document_id" },
    );
  if (updErr) throw updErr;

  // Also flip the documents.badge to 'PDF' so the tree icon shows up.
  const { error: badgeErr } = await supabase
    .from("documents")
    .update({ badge: "PDF" })
    .eq("id", documentId);
  if (badgeErr) throw badgeErr;

  revalidatePath("/");
}
