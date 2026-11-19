const next = require("next");
const path = require("path");
const express = require("express");
const { getUploadsDir, getAppRoot } = require("./upload-path");

const appRoot = getAppRoot();
const port = parseInt(process.env.PORT, 10) || 3000;
const hostname = process.env.HOST || "localhost";
const dev = process.env.NODE_ENV === "development";

const app = next({ dev, dir: appRoot, hostname, port });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = express();
    const uploadsDir = getUploadsDir();

    console.log(`[server.js] Application root: ${appRoot}`);
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
    });

    httpServer.on("error", (err) => {
      console.error("[server.js] Server error:", err);
      process.exit(1);
    });
  })
  .catch((err) => {
    console.error("[server.js] Failed to start Next.js:", err);
    process.exit(1);
  });