import { NextResponse } from "next/server";
import path from "path";
import { readFile } from "fs/promises";
import { resolveUploadedFilePath } from "@/lib/upload-path";

export const dynamic = "force-dynamic";

const MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".json": "application/json",
  ".xml": "application/xml",
};

export async function GET(req, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const fileSegments = resolvedParams?.file || [];
    const relativePath = Array.isArray(fileSegments)
      ? fileSegments.join("/")
      : String(fileSegments);

    // Prevent directory traversal
    const safePath = path
      .normalize(decodeURIComponent(relativePath))
      .replace(/^(\.\.[\/\\])+/, "");

    const resolved = resolveUploadedFilePath(safePath);

    if (!resolved.exists) {
      return new NextResponse(`File not found: ${safePath}`, { status: 404 });
    }

    const fileBuffer = await readFile(/*turbopackIgnore: true*/ resolved.fullPath);
    const ext = path.extname(resolved.fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(fileBuffer.length),
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("[uploads/route] Error serving uploaded file:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
