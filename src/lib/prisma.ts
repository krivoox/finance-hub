import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function shouldLogQueries(): boolean {
  if (env.NODE_ENV !== "development") return false;
  return env.PRISMA_LOG_QUERIES === "1" || env.PRISMA_LOG_QUERIES === "true";
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL ?? "",
  });

  return new PrismaClient({
    adapter,
    log: shouldLogQueries()
      ? ["query", "error", "warn"]
      : env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
