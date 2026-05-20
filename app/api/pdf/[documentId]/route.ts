import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "documents-pdf";

/**
 * Streams the stored PDF for <documentId> back to the browser.
 *   GET /api/pdf/ch2-1-4
 *
 * 401 if not authenticated, 404 if no PDF is linked to the document.
 *
 * Cached for 60s (immutable bytes per upload; refresh after edits is handled
 * by `revalidatePath` invalidating the surrounding page).
 */
export async function GET(
  _request: Request,
  { params }: { params: { documentId: string } },
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: content } = await supabase
    .from("document_content")
    .select("pdf_storage_path")
    .eq("document_id", params.documentId)
    .maybeSingle();

  const path = (content as { pdf_storage_path?: string } | null)?.pdf_storage_path;
  if (!path) return new NextResponse("Not Found", { status: 404 });

  const { data: blob, error } = await supabase.storage
    .from(BUCKET)
    .download(path);
  if (error || !blob) return new NextResponse("Not Found", { status: 404 });

  return new NextResponse(blob, {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "private, max-age=60",
    },
  });
}
