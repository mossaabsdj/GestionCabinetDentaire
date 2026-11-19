const fs = require("fs");
const path = require("path");

/**
 * Returns the absolute root directory of the application.
 * Compatible with development (Next.js / Electron dev) and production (packaged Electron / standalone).
 */
function getAppRoot() {
  // 1. Explicit environment variable set by main.js or launch script
  if (process.env.APP_ROOT && fs.existsSync(/*turbopackIgnore: true*/ process.env.APP_ROOT)) {
    return path.resolve(process.env.APP_ROOT);
  }

  // 2. Packaged Electron runtime detection
  // In packaged builds (electron-builder), extraFiles puts 'public' in the install directory beside the exe
  if (process.resourcesPath) {
    // Option A: Directory containing the executable (install directory)
    if (process.execPath) {
      const execDir = path.dirname(process.execPath);
      if (fs.existsSync(/*turbopackIgnore: true*/ path.join(execDir, "public"))) {
        return execDir;
      }
    }
    // Option B: Parent of resourcesPath
    const parentResources = path.resolve(process.resourcesPath, "..");
    if (fs.existsSync(/*turbopackIgnore: true*/ path.join(parentResources, "public"))) {
      return parentResources;
    }
  }

  // 3. Fallback to process.cwd() (where package.json / public resides)
  return process.cwd();
}

/**
 * Returns the canonical absolute path to public/uploads directory.
 * Ensures the directory exists and is writable.
 *
 * @param {string} [subfolder=""] - Optional subfolder name, e.g. 'radios'
 * @returns {string} Absolute path to uploads directory
 */
function getUploadsDir(subfolder = "") {
  let baseDir = process.env.APP_UPLOADS_DIR;

  if (!baseDir || !fs.existsSync(/*turbopackIgnore: true*/ baseDir)) {
    const root = getAppRoot();
    baseDir = path.join(root, "public", "uploads");
  }

  // Prevent directory traversal if subfolder is passed
  const safeSubfolder = subfolder
    ? String(subfolder)
        .replace(/^[/\\]+/, "")
        .replace(/\.\.[/\\]/g, "")
    : "";

  const targetDir = safeSubfolder ? path.join(baseDir, safeSubfolder) : baseDir;

  try {
    if (!fs.existsSync(/*turbopackIgnore: true*/ targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true, mode: 0o777 });
    }
  } catch (err) {
    console.error(`[upload-path] Failed to create directory "${targetDir}":`, err.message);
  }

  return path.resolve(targetDir);
}

/**
 * Sanitizes a filename, preventing directory traversal and removing invalid characters.
 *
 * @param {string} originalName - Name of the file
 * @returns {string} Clean, safe filename
 */
function sanitizeFileName(originalName) {
  if (!originalName || typeof originalName !== "string") {
    return `file_${Date.now()}.bin`;
  }

  // Remove directory parts if present
  let clean = path.basename(originalName);

  // Split name and extension
  const rawExt = path.extname(clean);
  const ext = rawExt.toLowerCase();
  let base = path.basename(clean, rawExt);

  // Replace spaces, accents, and non-alphanumeric chars with underscore
  base = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accent marks
    .replace(/[^a-zA-Z0-9_\-\.]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!base) {
    base = `upload_${Date.now()}`;
  }

  return `${base}${ext}`;
}

/**
 * Generates a unique file path inside the target directory to avoid overwriting existing files.
 *
 * @param {string} directory - Target directory
 * @param {string} fileName - Requested file name
 * @returns {{ filename: string, fullPath: string, url: string }}
 */
function getUniqueFilePath(directory, fileName, urlPrefix = "/uploads") {
  const safeName = sanitizeFileName(fileName);
  const ext = path.extname(safeName);
  const base = path.basename(safeName, ext);

  let candidateName = safeName;
  let candidatePath = path.join(directory, candidateName);

  if (fs.existsSync(/*turbopackIgnore: true*/ candidatePath)) {
    // Append timestamp and random tag to guarantee uniqueness
    const timestamp = Date.now();
    const rand = Math.floor(Math.random() * 1000);
    candidateName = `${base}_${timestamp}_${rand}${ext}`;
    candidatePath = path.join(directory, candidateName);
  }

  const cleanPrefix = urlPrefix.endsWith("/") ? urlPrefix.slice(0, -1) : urlPrefix;
  const url = `${cleanPrefix}/${candidateName}`;

  return {
    filename: candidateName,
    fullPath: candidatePath,
    url,
  };
}

/**
 * Resolves a file URL or relative path to its actual physical file on disk.
 *
 * @param {string} fileUrlOrPath - E.g. "/uploads/radios/image.jpg", "uploads/image.png", "image.png"
 * @returns {{ exists: boolean, fullPath: string, url: string }}
 */
function resolveUploadedFilePath(fileUrlOrPath) {
  if (!fileUrlOrPath || typeof fileUrlOrPath !== "string") {
    return { exists: false, fullPath: "", url: "" };
  }

  let cleanInput = fileUrlOrPath.trim();

  // Strip file:// prefix if present
  if (cleanInput.startsWith("file://")) {
    cleanInput = decodeURIComponent(cleanInput.replace(/^file:\/\/\/?/, ""));
  }

  // If already an absolute path that exists
  if (path.isAbsolute(cleanInput) && fs.existsSync(/*turbopackIgnore: true*/ cleanInput)) {
    return {
      exists: true,
      fullPath: path.resolve(cleanInput),
      url: `/uploads/${path.basename(cleanInput)}`,
    };
  }

  // Normalize slashes
  cleanInput = cleanInput.replace(/\\/g, "/");

  // Strip leading /uploads/ or uploads/
  let relPath = cleanInput;
  if (relPath.startsWith("/uploads/")) {
    relPath = relPath.slice("/uploads/".length);
  } else if (relPath.startsWith("uploads/")) {
    relPath = relPath.slice("uploads/".length);
  } else if (relPath.startsWith("/")) {
    relPath = relPath.slice(1);
  }

  // Prevent traversal
  relPath = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, "");

  const uploadsDir = getUploadsDir();
  const appRoot = getAppRoot();

  // 1. Try directly inside uploads directory
  const candidateUploads = path.resolve(uploadsDir, relPath);
  if (fs.existsSync(/*turbopackIgnore: true*/ candidateUploads)) {
    return {
      exists: true,
      fullPath: candidateUploads,
      url: `/uploads/${relPath.replace(/\\/g, "/")}`,
    };
  }

  // 2. Try inside public/uploads of appRoot
  const candidateRootUploads = path.resolve(appRoot, "public", "uploads", relPath);
  if (fs.existsSync(/*turbopackIgnore: true*/ candidateRootUploads)) {
    return {
      exists: true,
      fullPath: candidateRootUploads,
      url: `/uploads/${relPath.replace(/\\/g, "/")}`,
    };
  }

  // 3. Try inside public/ directly (e.g. public/image.PNG)
  const candidatePublic = path.resolve(appRoot, "public", relPath);
  if (fs.existsSync(/*turbopackIgnore: true*/ candidatePublic)) {
    return {
      exists: true,
      fullPath: candidatePublic,
      url: `/${relPath.replace(/\\/g, "/")}`,
    };
  }

  // 4. Try just the basename inside uploads directory
  const baseOnly = path.basename(relPath);
  const candidateBasename = path.resolve(uploadsDir, baseOnly);
  if (fs.existsSync(/*turbopackIgnore: true*/ candidateBasename)) {
    return {
      exists: true,
      fullPath: candidateBasename,
      url: `/uploads/${baseOnly}`,
    };
  }

  // Return the standard expected uploads path even if it doesn't exist yet
  return {
    exists: false,
    fullPath: candidateUploads,
    url: `/uploads/${relPath.replace(/\\/g, "/")}`,
  };
}

/**
 * Helper to determine if a file is an image based on extension.
 */
function isImage(filePathOrName) {
  if (!filePathOrName) return false;
  const ext = path.extname(filePathOrName).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".bmp", ".ico"].includes(ext);
}

/**
 * Helper to determine if a file is a PDF based on extension.
 */
function isPdf(filePathOrName) {
  if (!filePathOrName) return false;
  const ext = path.extname(filePathOrName).toLowerCase();
  return ext === ".pdf";
}

module.exports = {
  getAppRoot,
  getUploadsDir,
  sanitizeFileName,
  getUniqueFilePath,
  resolveUploadedFilePath,
  isImage,
  isPdf,
};
