import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { getUploadsDir, getUniqueFilePath } from "@/lib/upload-path";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const subfolder = formData.get("subfolder") || formData.get("folder") || "";

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "Aucun fichier reçu ou format invalide." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json(
        { error: "Le fichier reçu est vide (0 octets)." },
        { status: 400 },
      );
    }

    // Resolve canonical uploads directory (e.g. public/uploads or public/uploads/radios)
    const targetDir = getUploadsDir(String(subfolder));
    const urlPrefix = subfolder ? `/uploads/${subfolder}` : "/uploads";

    const { filename, fullPath, url } = getUniqueFilePath(
      targetDir,
      file.name || "upload.bin",
      urlPrefix,
    );

    await writeFile(fullPath, buffer);
    console.log(`[api/upload] Successfully saved file (${buffer.length} bytes) to:`, fullPath);

    return NextResponse.json(
      {
        message: "Fichier téléversé avec succès.",
        url,
        filename,
        fullPath,
        size: buffer.length,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[api/upload] Erreur lors du téléversement:", error);
    return NextResponse.json(
      { error: `Échec du téléversement: ${error.message}` },
      { status: 500 },
    );
  }
}
