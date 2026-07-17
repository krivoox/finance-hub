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

/**
 * HMR / long-lived `globalThis` can keep a PrismaClient from before a schema
 * change. Recreate when required delegates are missing (ADR-006 models).
 */
function hasRequiredDelegates(client: PrismaClient): boolean {
  const c = client as PrismaClient & {
    workspaceConsolidationRate?: { findUnique?: unknown };
    currencyExchange?: { findUnique?: unknown };
  };
  return (
    typeof c.workspaceConsolidationRate?.findUnique === "function" &&
    typeof c.currencyExchange?.findUnique === "function"
  );
}

function getPrismaClient(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing && hasRequiredDelegates(existing)) {
    return existing;
  }

  const client = createPrismaClient();
  if (env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma: PrismaClient = getPrismaClient();
