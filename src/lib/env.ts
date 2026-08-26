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
  /** Canonical app URL. On Vercel Preview this is overridden by VERCEL_URL. */
  BETTER_AUTH_URL: z.string().url().optional(),
  /** Comma-separated extra origins (e.g. "https://app.example.com,http://192.168.0.28:3000"). */
  BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),

  /** Vercel system: "production" | "preview" | "development". */
  VERCEL_ENV: z.enum(["production", "preview", "development"]).optional(),
  /** Vercel system: deployment hostname without protocol. */
  VERCEL_URL: z.string().optional(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url().default("http://127.0.0.1:54321"),
  /** Public anon key. Unused until Storage ships with its own RLS (KRI-18). */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().default(""),

  /**
   * Google OAuth (SPEC-01). Optional — without both vars, email/password still
   * works and the Continuar con Google button stays hidden.
   */
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

  /** Set to "1" / "true" to log every Prisma SQL statement in development. */
  PRISMA_LOG_QUERIES: z
    .enum(["0", "1", "true", "false"])
    .optional()
    .default("0"),

  /**
   * SPEC-19 — Daily USD quotes (DolarApi). Off when unset/"false".
   * Without this, sidebar/dashboard hide feed + apply-from-quote CTA.
   */
  USD_QUOTES_ENABLED: z
    .enum(["0", "1", "true", "false"])
    .optional()
    .default("true"),

  /** Optional override; default https://dolarapi.com */
  DOLARAPI_BASE_URL: z.string().url().optional(),

  /**
   * Public Cafecito profile URL for the donation soft-ask dialog.
   * When unset, the popup and menu entry stay hidden.
   * Example: https://cafecito.app/tu-usuario
   */
  NEXT_PUBLIC_CAFECITO_URL: z.string().url().optional(),

  /** Bearer for /api/cron/* routes (Vercel Cron). */
  CRON_SECRET: z.string().min(1).optional(),

  /**
   * Resend (SPEC-21 / KRI-17). Optional so local/CI boot without email.
   * Production password reset and marketing require this key.
   */
  RESEND_API_KEY: z.string().min(1).optional(),
  /**
   * Verified sender. Sandbox default only delivers to the Resend account email.
   * Production: use a domain verified in Resend (SPF/DKIM/DMARC).
   */
  EMAIL_FROM: z.string().min(1).default("Finance Hub <onboarding@resend.dev>"),
  EMAIL_REPLY_TO: z.string().email().optional(),
  /** Segment of opted-in product-update contacts (broadcasts). */
  RESEND_MARKETING_SEGMENT_ID: z.string().min(1).optional(),
});

/**
 * Resolve Better Auth base URL so Preview deployments match the request Origin.
 *
 * Preview URLs are ephemeral (`*.vercel.app`). If `BETTER_AUTH_URL` is shared
 * with Production, CSRF origin checks reject sign-in on develop/PR previews.
 */
function resolveBetterAuthUrl(input: {
  BETTER_AUTH_URL?: string;
  VERCEL_ENV?: "production" | "preview" | "development";
  VERCEL_URL?: string;
}): string {
  if (input.VERCEL_ENV === "preview" && input.VERCEL_URL) {
    return `https://${input.VERCEL_URL}`;
  }

  if (input.BETTER_AUTH_URL) {
    return input.BETTER_AUTH_URL;
  }

  if (input.VERCEL_URL) {
    return `https://${input.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(
    `Invalid environment variables. Set them in .env / .env.local.\n${details}`,
  );
}

const data = parsed.data;

function flagEnabled(value: string | undefined, defaultOn: boolean): boolean {
  if (value == null) return defaultOn;
  return value === "1" || value === "true";
}

export const env = {
  ...data,
  BETTER_AUTH_URL: resolveBetterAuthUrl(data),
  USD_QUOTES_ENABLED: flagEnabled(data.USD_QUOTES_ENABLED, true),
  DOLARAPI_BASE_URL: data.DOLARAPI_BASE_URL ?? "https://dolarapi.com",
  NEXT_PUBLIC_CAFECITO_URL: data.NEXT_PUBLIC_CAFECITO_URL ?? null,
};

/** True when Google social sign-in can be offered (both credentials present). */
export const isGoogleOAuthEnabled = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
);

/** True when the Resend SDK can send (transactional + marketing). */
export const isResendEnabled = Boolean(env.RESEND_API_KEY);

export type Env = typeof env;
