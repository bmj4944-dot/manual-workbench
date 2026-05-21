import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "documents-attachments";

/**
 * Streams the requested attachment back with proper Content-Disposition so
 * the browser triggers a download.
 *   GET /api/attachments/<uuid>
 *   GET /api/attachments/<uuid>?inline=1   — inline view (PDF etc.)
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: row, error } = await supabase
    .from("attachments")
    .select("file_name, mime_type, storage_path")
    .eq("id", params.id)
    .maybeSingle();
  if (error || !row) return new NextResponse("Not Found", { status: 404 });

  const path = (row as { storage_path: string }).storage_path;
  const fileName = (row as { file_name: string }).file_name;
  const mime =
    (row as { mime_type?: string }).mime_type || "application/octet-stream";

  const { data: blob, error: dlErr } = await supabase.storage
    .from(BUCKET)
    .download(path);
  if (dlErr || !blob) return new NextResponse("Not Found", { status: 404 });

  const inline = new URL(request.url).searchParams.get("inline") === "1";
  const disposition = inline
    ? `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`
    : `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`;

  return new NextResponse(blob, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=60",
    },
  });
}
