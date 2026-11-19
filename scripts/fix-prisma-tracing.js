const fs = require("fs");
const path = require("path");

const prismaIndexPath = path.join(__dirname, "..", "app", "generated", "prisma", "index.js");
const prismaLibPath = path.join(__dirname, "..", "app", "generated", "prisma", "runtime", "library.js");

// 1. Fix app/generated/prisma/index.js dynamic dirname tracing
if (fs.existsSync(prismaIndexPath)) {
  let content = fs.readFileSync(prismaIndexPath, "utf8");
  let modified = false;

  // Replace dynamic path.join(process.cwd(), alternativePath)
  if (content.includes("config.dirname = path.join(process.cwd(), alternativePath)")) {
    content = content.replace(
      "config.dirname = path.join(process.cwd(), alternativePath)",
      "config.dirname = path.join(/*turbopackIgnore: true*/ process.cwd(), alternativePath)"
    );
    modified = true;
  }

  // Replace dynamic fs.existsSync(path.join(process.cwd(), ...))
  if (content.includes("return fs.existsSync(path.join(process.cwd(), altPath, 'schema.prisma'))")) {
    content = content.replace(
      "return fs.existsSync(path.join(process.cwd(), altPath, 'schema.prisma'))",
      "return fs.existsSync(/*turbopackIgnore: true*/ path.join(process.cwd(), altPath, 'schema.prisma'))"
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(prismaIndexPath, content, "utf8");
    console.log("[fix-prisma-tracing] Patched app/generated/prisma/index.js successfully.");
  }
}

// 2. Fix app/generated/prisma/runtime/library.js .env.vault tracing
if (fs.existsSync(prismaLibPath)) {
  let content = fs.readFileSync(prismaLibPath, "utf8");
  let modified = false;

  // Find the .env.vault existsSync call: Fi.existsSync(r)?r:null
  const target = '.env.vault");return Fi.existsSync(r)?r:null}';
  if (content.includes(target)) {
    content = content.replace(
      target,
      '.env.vault");return Fi.existsSync(/*turbopackIgnore: true*/ r)?r:null}'
    );
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(prismaLibPath, content, "utf8");
    console.log("[fix-prisma-tracing] Patched app/generated/prisma/runtime/library.js successfully.");
  }
}
