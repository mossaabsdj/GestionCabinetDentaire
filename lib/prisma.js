import { PrismaClient } from "@/app/generated/prisma"; // ✅ correct for your output path

// Ensure environment variables are loaded if DATABASE_URL is not present
if (!process.env.DATABASE_URL) {
  try {
    const { loadEnv } = require("./env-loader");
    loadEnv();
  } catch (_) {}
}

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

