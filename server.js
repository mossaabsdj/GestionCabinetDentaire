const next = require("next");
const path = require("path");
const express = require("express");
const { getUploadsDir, getAppRoot } = require("./upload-path");

const appRoot = getAppRoot();
const app = next({ dev: false, dir: appRoot });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

app.prepare().then(() => {
  const server = express();
  const uploadsDir = getUploadsDir();

  console.log(`[server.js] Application root: ${appRoot}`);
  console.log(`[server.js] Serving uploads from: ${uploadsDir}`);

  // Permissive CORS and resource sharing headers for Electron webviews and print windows
  server.use((req, res, nextMiddleware) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    nextMiddleware();
  });

  // Serve static uploads directory so uploaded images/files are immediately accessible
  server.use(
    "/uploads",
    express.static(uploadsDir, {
      maxAge: "1d",
      etag: true,
      fallthrough: true,
    }),
  );

  // Fallback: also check public folder directly for backwards compatibility (e.g. /uploads/image.PNG -> public/image.PNG)
  server.use(
    "/uploads",
    express.static(path.join(appRoot, "public"), {
      maxAge: "1d",
      etag: true,
      fallthrough: true,
    }),
  );

  server.all("*splat", (req, res) => {
    handle(req, res);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Next.js server running on http://localhost:${port}`);
  });
});
