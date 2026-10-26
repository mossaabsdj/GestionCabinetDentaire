// Re-export core encryption module for Next.js App Router API routes
const backupCrypto = require("../backup-crypto");

export const BACKUP_FORMAT = backupCrypto.BACKUP_FORMAT;
export const BACKUP_VERSION = backupCrypto.BACKUP_VERSION;
export const encryptBackup = backupCrypto.encryptBackup;
export const decryptBackup = backupCrypto.decryptBackup;
export const inspectBackupEnvelope = backupCrypto.inspectBackupEnvelope;
export const deriveKey = backupCrypto.deriveKey;
export const getBackupSecretKey = backupCrypto.getBackupSecretKey;
export const getStaticSecret = backupCrypto.getStaticSecret;

export default backupCrypto;
