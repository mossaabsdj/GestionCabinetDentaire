const fs = require("fs");
const path = require("path");
const { encryptBackup, getStaticSecret } = require("./backup-crypto");

async function backupDatabase(targetFilePath = null, password = null) {
  try {
    const backupDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const defaultPath = path.join(backupDir, `backup_dentaire_${timestamp}.cbak`);
    const filePath = targetFilePath || defaultPath;

    const res = await fetch("http://localhost:3000/api/backup");
    if (!res.ok) {
      throw new Error(`API backup returned status ${res.status}`);
    }

    const rawData = await res.json();

    // Encrypt the entire database payload using static secret from .env (or custom password)
    const secret = password || getStaticSecret();
    const encryptedEnvelope = encryptBackup(rawData, secret, "dentaire");

    fs.writeFileSync(filePath, JSON.stringify(encryptedEnvelope, null, 2), "utf-8");
    console.log("✅ Encrypted backup saved successfully to:", filePath);
    return { success: true, filePath };
  } catch (error) {
    console.error("❌ Backup failed:", error.message);
    throw error;
  }
}

module.exports = { backupDatabase };
