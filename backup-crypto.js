/**
 * backup-crypto.js
 *
 * Secure Database Backup Encryption and Decryption Module
 * - AES-256-GCM authenticated symmetric encryption
 * - scrypt password-based key derivation function (offline-secure, memory-hard)
 * - Static secret key loaded from .env (BACKUP_SECRET_KEY)
 * - Associated Authenticated Data (AAD) binding format, version, and app name
 * - Unique 96-bit random IV and 32-byte salt per export
 * - In-memory key zeroing after use
 * - Legacy unencrypted JSON backup compatibility
 * - Inter-application cross-restore protection ("dentaire" vs "pediatre")
 */

const crypto = require("crypto");
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const BACKUP_FORMAT = "CABINET_SECURE_BACKUP";
const BACKUP_VERSION = 1;

// Recommended scrypt parameters for offline password-based key derivation
const SCRYPT_PARAMS = {
  keyLen: 32, // 256-bit key for AES-256
  cost: 32768, // N: CPU/memory cost parameter (2^15)
  blockSize: 8, // r: block size (8)
  parallelization: 1, // p: parallelization factor (1)
  maxmem: 64 * 1024 * 1024, // 64 MB memory limit
};

/**
 * Retrieves the static backup encryption secret key from environment variables or .env file.
 */
function getBackupSecretKey() {
  if (process.env.BACKUP_SECRET_KEY && process.env.BACKUP_SECRET_KEY.trim()) {
    return process.env.BACKUP_SECRET_KEY.trim();
  }

  const candidateDirs = [
    process.cwd(),
    __dirname,
    typeof process.execPath === "string" ? path.join(process.execPath, "..") : null,
    typeof process.resourcesPath === "string" ? process.resourcesPath : null,
  ].filter(Boolean);

  for (const dir of candidateDirs) {
    const envFile = path.join(dir, ".env");
    if (fs.existsSync(envFile)) {
      try {
        const content = fs.readFileSync(envFile, "utf-8");
        const match = content.match(/^\s*BACKUP_SECRET_KEY\s*=\s*["']?(.*?)["']?\s*$/m);
        if (match && match[1] && match[1].trim()) {
          const key = match[1].trim();
          process.env.BACKUP_SECRET_KEY = key;
          return key;
        }
      } catch (_) {}
    }
  }

  return "CabinetAmelSecure2026!SecretKey";
}

/**
 * Derives a 256-bit cryptographic key from a password and salt using scrypt.
 * If password is not provided or empty, uses the static secret from .env.
 * @param {string} [password]
 * @param {Buffer} salt
 * @param {object} [params]
 * @returns {Buffer} 32-byte derived key
 */
function deriveKey(password, salt, params = SCRYPT_PARAMS) {
  const secret = (password && typeof password === "string" && password.trim().length > 0)
    ? password.trim()
    : getBackupSecretKey();

  if (!secret) {
    throw new Error("Un mot de passe ou une clé secrète dans .env est requis pour le chiffrement.");
  }

  return crypto.scryptSync(secret, salt, params.keyLen || 32, {
    N: params.cost || 32768,
    r: params.blockSize || 8,
    p: params.parallelization || 1,
    maxmem: params.maxmem || 64 * 1024 * 1024,
  });
}

/**
 * Encrypts an entire database backup payload with AES-256-GCM.
 * Protects all table names, column names, schema structures, relationships,
 * and database records inside an authenticated encrypted ciphertext.
 *
 * @param {object|string} payload Database contents to encrypt
 * @param {string} [password] User-provided secret or defaults to static secret in .env
 * @param {string} appName Application identifier ("dentaire" or "pediatre")
 * @returns {object} Versioned secure backup envelope
 */
function encryptBackup(payload, password = null, appName = "cabinet") {
  const secret = (password && typeof password === "string" && password.trim().length > 0)
    ? password.trim()
    : getBackupSecretKey();

  if (!secret || secret.length < 4) {
    throw new Error("La clé secrète de sauvegarde doit comporter au moins 4 caractères.");
  }

  const plaintext = typeof payload === "string" ? payload : JSON.stringify(payload);
  const uncompressedBuffer = Buffer.from(plaintext, "utf-8");
  const plaintextBuffer = zlib.gzipSync(uncompressedBuffer);

  // Generate cryptographically secure random salt (32 bytes) and IV (12 bytes for GCM)
  const salt = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);

  // Derive AES-256 key
  const key = deriveKey(secret, salt, SCRYPT_PARAMS);

  try {
    // Initialize AES-256-GCM cipher
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    // Bind non-sensitive envelope metadata as Additional Authenticated Data (AAD)
    const aad = Buffer.from(`${BACKUP_FORMAT}:${BACKUP_VERSION}:${appName}`, "utf-8");
    cipher.setAAD(aad);

    const ciphertext = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      app: appName,
      createdAt: new Date().toISOString(),
      compressed: true,
      kdf: {
        algorithm: "scrypt",
        salt: salt.toString("hex"),
        keyLen: SCRYPT_PARAMS.keyLen,
        cost: SCRYPT_PARAMS.cost,
        blockSize: SCRYPT_PARAMS.blockSize,
        parallelization: SCRYPT_PARAMS.parallelization,
      },
      cipher: {
        algorithm: "aes-256-gcm",
        iv: iv.toString("hex"),
        tag: tag.toString("hex"),
      },
      ciphertext: ciphertext.toString("base64"),
    };
  } finally {
    // Safely zero out key buffer from memory
    key.fill(0);
  }
}

/**
 * Inspects a backup file or object to determine whether it is an encrypted envelope
 * and returns basic non-sensitive metadata without attempting decryption.
 *
 * @param {object|string} fileContent
 * @returns {object} Metadata object: { isEncrypted, format, version, app, createdAt }
 */
function inspectBackupEnvelope(fileContent) {
  let envelope = fileContent;
  if (typeof envelope === "string") {
    try {
      envelope = JSON.parse(envelope);
    } catch {
      return { isEncrypted: false, isValid: false, error: "Fichier non-JSON ou corrompu" };
    }
  }

  if (!envelope || typeof envelope !== "object") {
    return { isEncrypted: false, isValid: false, error: "Contenu invalide" };
  }

  if (envelope.format === BACKUP_FORMAT) {
    return {
      isValid: true,
      isEncrypted: true,
      format: envelope.format,
      version: envelope.version,
      app: envelope.app,
      createdAt: envelope.createdAt,
    };
  }

  // Check if legacy unencrypted backup
  if (envelope.app && (envelope.data || envelope.counts)) {
    return {
      isValid: true,
      isEncrypted: false,
      format: "LEGACY_JSON",
      version: envelope.version || "legacy",
      app: envelope.app,
      createdAt: envelope.exportedAt,
    };
  }

  return { isValid: false, isEncrypted: false, error: "Format non reconnu" };
}

/**
 * Decrypts and validates an encrypted backup envelope using AES-256-GCM.
 * Rejects corrupted, tampered, wrong-password, or incompatible files before
 * touching the database.
 * If password is not provided, uses the static secret key from .env.
 *
 * @param {object|string} envelopeData
 * @param {string} [password] User-provided secret or defaults to static secret in .env
 * @param {string} [expectedApp] e.g. "dentaire" or "pediatre"
 * @returns {object} The decrypted and verified database payload
 */
function decryptBackup(envelopeData, password = null, expectedApp = null) {
  let envelope = envelopeData;
  if (typeof envelope === "string") {
    try {
      envelope = JSON.parse(envelope);
    } catch {
      throw new Error("Le fichier de sauvegarde est corrompu ou n'est pas un JSON valide.");
    }
  }

  if (!envelope || typeof envelope !== "object") {
    throw new Error("Données de sauvegarde invalides.");
  }

  // Legacy unencrypted backup handling
  if (envelope.format !== BACKUP_FORMAT) {
    if (envelope.app && (envelope.data || envelope.counts)) {
      if (expectedApp && envelope.app && envelope.app !== expectedApp) {
        const appLabel = envelope.app === "dentaire" ? "Cabinet Dentaire" : "Cabinet Pédiatrique";
        const expectedLabel = expectedApp === "dentaire" ? "Cabinet Dentaire" : "Cabinet Pédiatrique";
        throw new Error(`Ce fichier de sauvegarde provient de ${appLabel} et ne peut pas être restauré dans ${expectedLabel}.`);
      }
      return envelope;
    }
    throw new Error("Format de sauvegarde non reconnu ou non supporté.");
  }

  if (envelope.version !== BACKUP_VERSION) {
    throw new Error(`Version de sauvegarde incompatible (v${envelope.version}). Version requise: v${BACKUP_VERSION}.`);
  }

  if (expectedApp && envelope.app && envelope.app !== expectedApp) {
    const appLabel = envelope.app === "dentaire" ? "Cabinet Dentaire" : "Cabinet Pédiatrique";
    const expectedLabel = expectedApp === "dentaire" ? "Cabinet Dentaire" : "Cabinet Pédiatrique";
    throw new Error(`Ce fichier de sauvegarde provient de ${appLabel} et ne peut pas être restauré dans ${expectedLabel}.`);
  }

  const secret = (password && typeof password === "string" && password.trim().length > 0)
    ? password.trim()
    : getBackupSecretKey();

  if (!secret) {
    throw new Error("Une clé secrète est requise pour déchiffrer cette sauvegarde.");
  }

  if (!envelope.cipher || !envelope.cipher.iv || !envelope.cipher.tag || !envelope.ciphertext) {
    throw new Error("Le fichier de sauvegarde est incomplet ou altéré (paramètres de chiffrement manquants).");
  }

  if (!envelope.kdf || !envelope.kdf.salt) {
    throw new Error("Paramètres de dérivation de clé manquants dans le fichier de sauvegarde.");
  }

  const salt = Buffer.from(envelope.kdf.salt, "hex");
  const iv = Buffer.from(envelope.cipher.iv, "hex");
  const tag = Buffer.from(envelope.cipher.tag, "hex");
  const ciphertext = Buffer.from(envelope.ciphertext, "base64");

  const kdfParams = {
    keyLen: envelope.kdf.keyLen || 32,
    cost: envelope.kdf.cost || 32768,
    blockSize: envelope.kdf.blockSize || 8,
    parallelization: envelope.kdf.parallelization || 1,
    maxmem: 64 * 1024 * 1024,
  };

  // Derive key using exact envelope parameters
  const key = deriveKey(secret, salt, kdfParams);

  try {
    // Initialize decipher
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    const aad = Buffer.from(`${BACKUP_FORMAT}:${envelope.version}:${envelope.app}`, "utf-8");
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);

    let decryptedBuffer;
    try {
      decryptedBuffer = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch (err) {
      // In AES-256-GCM, any wrong password, tampered byte, or modified header causes decipher.final() to fail
      throw new Error("Mot de passe incorrect ou fichier de sauvegarde altéré / corrompu.");
    }

    let plaintextBuffer;
    if (envelope.compressed) {
      try {
        plaintextBuffer = zlib.gunzipSync(decryptedBuffer);
      } catch (decompErr) {
        throw new Error("Échec de la décompression des données déchiffrées : " + decompErr.message);
      }
    } else {
      plaintextBuffer = decryptedBuffer;
    }

    const decryptedJson = plaintextBuffer.toString("utf-8");
    let payload;
    try {
      payload = JSON.parse(decryptedJson);
    } catch {
      throw new Error("Les données déchiffrées sont corrompues (structure JSON invalide).");
    }

    if (!payload || typeof payload !== "object") {
      throw new Error("Structure des données de sauvegarde restaurées invalide.");
    }

    const data = payload.data || payload;
    if (!data || typeof data !== "object") {
      throw new Error("Structure de sauvegarde invalide : conteneur de données manquant.");
    }

    return payload;
  } finally {
    key.fill(0);
  }
}

module.exports = {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  encryptBackup,
  decryptBackup,
  inspectBackupEnvelope,
  deriveKey,
  getBackupSecretKey,
  getStaticSecret: getBackupSecretKey,
};
