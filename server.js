const next = require("next");
const path = require("path");
const express = require("express");

const app = next({ dev: false, dir: path.join(__dirname, ".") });
const handle = app.getRequestHandler();

const port = process.env.PORT || 3000;

app.prepare().then(() => {
  const server = express();
  console.log("server here");

  // Serve static uploads directory so newly uploaded files at runtime are accessible in production
  server.use(
    "/uploads",
    express.static(path.join(__dirname, "public", "uploads")),
  );

  server.all("*splat", (req, res) => {
    handle(req, res);
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Next.js server running on http://localhost:${port}`);
  });
});
