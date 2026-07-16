import { z } from "zod";

const isProd = process.env.NODE_ENV === "production";

const requiredInProd = <T extends z.ZodTypeAny>(schema: T) =>
  isProd ? schema : schema.optional();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  DATABASE_URL: requiredInProd(z.string().url()),
  DIRECT_URL: requiredInProd(z.string().url()),

  BETTER_AUTH_SECRET: isProd
    ? z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 chars")
    : z.string().min(1).default("dev-secret-please-change-me-32-chars-min"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  /** Comma-separated extra origins (e.g. "https://app.example.com,http://192.168.0.28:3000"). */
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),

  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url()
    .default("http://127.0.0.1:54321"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  /** Set to "1" / "true" to log every Prisma SQL statement in development. */
  PRISMA_LOG_QUERIES: z
    .enum(["0", "1", "true", "false"])
    .optional()
    .default("0"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(
    `Invalid environment variables. Set them in .env / .env.local.\n${details}`,
  );
}

export const env = parsed.data;
export type Env = typeof env;
