const fs = require("fs");
const { decryptBackup, inspectBackupEnvelope, getStaticSecret } = require("./backup-crypto");

async function restoreDatabase(filePath, password = null) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Le fichier de sauvegarde n'existe pas : ${filePath}`);
    }

    const content = fs.readFileSync(filePath, "utf-8");

    // Inspect envelope and validate format
    const inspection = inspectBackupEnvelope(content);
    if (!inspection.isValid) {
      throw new Error(inspection.error || "Fichier de sauvegarde non valide ou corrompu.");
    }

    let payloadToRestore;
    if (inspection.isEncrypted) {
      // Authenticated decryption with AES-256-GCM using static secret from .env or provided password
      const secret = password || getStaticSecret();
      payloadToRestore = decryptBackup(content, secret, "dentaire");
    } else {
      // Legacy unencrypted backup support
      payloadToRestore = decryptBackup(content, null, "dentaire");
    }

    // Safely send decrypted and validated payload to API
    const res = await fetch("http://localhost:3000/api/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadToRestore),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Erreur de restauration via l'API");
    }

    console.log("✅ Database restored successfully from:", filePath);
    return { success: true, message: result.message };
  } catch (error) {
    console.error("❌ Restore failed:", error.message);
    throw error;
  }
}

function inspectBackupFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { isValid: false, error: "Le fichier n'existe pas" };
  }
  const content = fs.readFileSync(filePath, "utf-8");
  return inspectBackupEnvelope(content);
}

module.exports = { restoreDatabase, inspectBackupFile };
