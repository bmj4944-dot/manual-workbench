import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "documents-attachments";
const ALLOWED_PREFIX = "_editor/"; // only serve editor-uploaded files; this
//                                    prevents using this route to read other
//                                    users' general attachments (those have
//                                    their own ID-gated route).

const EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

/**
 * Streams an editor-inline image stored under `documents-attachments/_editor/…`.
 *   GET /api/editor-images/_editor/<documentId>/<uuid>.<ext>
 *
 * Only authenticated users can read. Path must start with `_editor/` so this
 * route can't be repurposed to fetch other users' general attachments.
 */
export async function GET(
  _request: Request,
  { params }: { params: { path: string[] } },
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const path = params.path.join("/");
  if (!path.startsWith(ALLOWED_PREFIX)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { data: blob, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !blob) return new NextResponse("Not Found", { status: 404 });

  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const mime = EXT_MIME[ext] ?? "application/octet-stream";

  return new NextResponse(blob, {
    headers: {
      "Content-Type": mime,
      // Inline image, immutable (UUID-named so the URL never aliases content).
      "Cache-Control": "private, max-age=3600, immutable",
    },
  });
}
