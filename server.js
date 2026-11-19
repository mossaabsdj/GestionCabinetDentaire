// Load environment variables early (reads from app.asar in production)
const { loadEnv } = require("./lib/env-loader");
loadEnv();

// In packaged mode, ensure PRISMA_QUERY_ENGINE_LIBRARY is configured
if (!process.env.PRISMA_QUERY_ENGINE_LIBRARY && process.resourcesPath) {
  const path = require("path");
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = path.join(
    process.resourcesPath,
    "app.asar.unpacked",
    "app/generated/prisma/query_engine-windows.dll.node",
  );
}

const next = require("next");
const path = require("path");
const fs = require("fs");
const express = require("express");
const { getUploadsDir, getAppRoot } = require("./upload-path");

// Resolve the directory where Next.js build artifacts (.next) reside
function getNextDir() {
  // 1. In packaged Electron or standard root, check __dirname (.next inside app.asar or repo)
  if (fs.existsSync(path.join(__dirname, ".next"))) {
    return __dirname;
  }
  // 2. Check appRoot
  const root = getAppRoot();
  if (fs.existsSync(path.join(root, ".next"))) {
    return root;
  }
  // 3. Check process.resourcesPath/app.asar
  if (process.resourcesPath) {
    const asarDir = path.join(process.resourcesPath, "app.asar");
    if (fs.existsSync(path.join(asarDir, ".next"))) {
      return asarDir;
    }
  }
  // 4. Default fallback
  return fs.existsSync(path.join(process.cwd(), ".next")) ? process.cwd() : __dirname;
}

const appRoot = getAppRoot();
const nextDir = getNextDir();
const port = parseInt(process.env.PORT, 10) || 3000;
const hostname = process.env.HOST || "127.0.0.1";
const dev = process.env.NODE_ENV === "development";

console.log(`[server.js] Next.js directory (.next): ${nextDir}`);
console.log(`[server.js] Application root (writable): ${appRoot}`);

const app = next({ dev, dir: nextDir, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = express();
    const uploadsDir = getUploadsDir();

    console.log(`[server.js] Serving uploads from: ${uploadsDir}`);

    // Permissive CORS for Electron webviews and print windows
    server.use((req, res, nextMiddleware) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      if (req.method === "OPTIONS") return res.sendStatus(204);
      nextMiddleware();
    });

    // Uploaded files
    server.use(
      "/uploads",
      express.static(uploadsDir, { maxAge: "1d", etag: true, fallthrough: true }),
    );

    // Fallback: public folder (e.g. /uploads/image.PNG -> public/image.PNG)
    server.use(
      "/uploads",
      express.static(path.join(appRoot, "public"), {
        maxAge: "1d",
        etag: true,
        fallthrough: true,
      }),
    );

    // Catch-all: works on Express 4 and 5, and matches "/"
    server.use((req, res) => handle(req, res));

    const httpServer = server.listen(port, hostname, () => {
      console.log(`> Next.js server running on http://${hostname}:${port}`);
      if (typeof process.send === "function") {
        process.send({
          type: "server-ready",
          port,
          hostname,
          url: `http://${hostname}:${port}`,
        });
      }
    });

    httpServer.on("error", (err) => {
      console.error("[server.js] Server error:", err);
      if (typeof process.send === "function") {
        process.send({
          type: "server-error",
          error: err.message,
          code: err.code,
        });
      }
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error("[server.js] Failed to start Next.js:", err);
    if (typeof process.send === "function") {
      process.send({
        type: "server-error",
        error: err ? (err.message || String(err)) : "Failed to start Next.js",
      });
    }
    process.exit(1);
  });