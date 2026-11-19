const fs = require("fs");
const path = require("path");

/**
 * Parses raw .env content into key-value pairs.
 * Correctly strips whitespace, comments (#), and surrounding quotes.
 */
function parseEnvContent(content) {
  const result = {};
  if (!content || typeof content !== "string") return result;

  const lines = content.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIdx = line.indexOf("=");
    if (eqIdx > 0) {
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();

      // Strip surrounding single or double quotes
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }

      result[key] = val;
    }
  }
  return result;
}

/**
 * Discovers and loads environment variables from .env.
 * Supports:
 * - Production packaged Electron (inside app.asar)
 * - Development (project root)
 * - Standalone server process
 * - Forked child processes
 */
function loadEnv() {
  const candidatePaths = [];

  // 1. Relative paths from __dirname (works in dev and inside app.asar)
  if (typeof __dirname !== "undefined") {
    candidatePaths.push(path.join(__dirname, "..", ".env"));
    candidatePaths.push(path.join(__dirname, ".env"));
  }

  // 2. Electron app path (in production, resolves inside app.asar)
  try {
    const electron = require("electron");
    const app = electron.app || (electron.remote && electron.remote.app);
    if (app && typeof app.getAppPath === "function") {
      candidatePaths.push(path.join(app.getAppPath(), ".env"));
    }
  } catch (_) {}

  // 3. Packaged resourcesPath -> app.asar/.env
  if (process.resourcesPath) {
    candidatePaths.push(path.join(process.resourcesPath, "app.asar", ".env"));
  }

  // 4. APP_ROOT environment variable if set
  if (process.env.APP_ROOT) {
    candidatePaths.push(path.join(process.env.APP_ROOT, ".env"));
  }

  // 5. Current working directory
  candidatePaths.push(path.join(process.cwd(), ".env"));

  let loadedFrom = null;

  for (const envPath of candidatePaths) {
    try {
      if (fs.existsSync(envPath)) {
        // Optional dotenv attempt
        try {
          const dotenv = require("dotenv");
          dotenv.config({ path: envPath });
        } catch (_) {}

        // Guarantee all variables are assigned via direct parser
        const content = fs.readFileSync(envPath, "utf8");
        const parsed = parseEnvContent(content);
        for (const [key, val] of Object.entries(parsed)) {
          if (!process.env[key] || process.env[key].trim() === "") {
            process.env[key] = val;
          }
        }

        loadedFrom = envPath;
        break;
      }
    } catch (_) {}
  }

  // Sanitize PostgreSQL connection strings for Neon / local drivers if needed
  if (process.env.DATABASE_URL) {
    process.env.DATABASE_URL = process.env.DATABASE_URL
      .replace(/&channel_binding=require/g, "")
      .replace(/\?channel_binding=require&/g, "?")
      .replace(/\?channel_binding=require$/g, "")
      .trim();
  }

  return { loadedFrom, env: process.env };
}

module.exports = {
  loadEnv,
  parseEnvContent,
};
