import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { nextCookies } from "@/lib/next-cookies";
import { createPersonalWorkspaceForUser } from "@/features/workspaces/services/create-personal-workspace";
import { sendPasswordResetEmail } from "@/features/email/services/runtime";

const googleClientId = env.GOOGLE_CLIENT_ID;
const googleClientSecret = env.GOOGLE_CLIENT_SECRET;
const googleSocialProviders =
  googleClientId && googleClientSecret
    ? {
        google: {
          clientId: googleClientId,
          clientSecret: googleClientSecret,
          prompt: "select_account" as const,
          mapProfileToUser: (profile: {
            name?: string | null;
            email?: string | null;
          }) => ({
            name: profile.name ?? profile.email ?? "Usuario",
            displayName: profile.name ?? undefined,
          }),
        },
      }
    : undefined;

function hostFromUrl(url: string): string | undefined {
  try {
    return new URL(url).host;
  } catch {
    return undefined;
  }
}

/**
 * Extra origins for CSRF. `allowedHosts` on baseURL are also trusted, but we
 * keep explicit Vercel + LAN entries for clarity and local device testing.
 */
function trustedOrigins(): string[] {
  const fromEnv =
    env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];

  const origins = [...fromEnv];

  if (env.VERCEL_URL) {
    origins.push(`https://${env.VERCEL_URL}`);
  }

  if (env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "production") {
    origins.push("https://*.vercel.app");
    // Custom domains under krivoox.com (prod + demo aliases).
    origins.push("https://*.krivoox.com");
  }

  if (env.NODE_ENV === "production") {
    return origins;
  }

  return [
    ...origins,
    "http://192.168.*.*:*",
    "http://10.*.*.*:*",
    "http://172.*.*.*:*",
    "http://127.0.0.1:*",
  ];
}

/**
 * Dynamic base URL (Better Auth): resolve per-request host so Vercel Preview /
 * branch aliases (`*.vercel.app`) match the browser Origin. Static
 * `BETTER_AUTH_URL` alone breaks login when Preview reuses Production URL.
 * @see https://www.better-auth.com/docs/guides/dynamic-base-url
 */
function resolveBaseURL():
  | string
  | {
      allowedHosts: string[];
      protocol: "http" | "https";
      fallback: string;
    } {
  const fallback = env.BETTER_AUTH_URL;
  const canonicalHost = hostFromUrl(fallback);
  const allowedHosts = [
    "localhost:*",
    "127.0.0.1:*",
    "*.vercel.app",
    "*.krivoox.com",
    ...(canonicalHost ? [canonicalHost] : []),
  ];

  // LAN hosts for device testing (`next dev` on http://192.168.x.x:3000).
  // Without these, dynamic baseURL falls back to localhost and breaks cookies/CSRF.
  if (env.NODE_ENV !== "production") {
    allowedHosts.push("192.168.*.*:*", "10.*.*.*:*", "172.*.*.*:*");
  }

  return {
    allowedHosts,
    protocol: env.NODE_ENV === "development" ? "http" : "https",
    fallback,
  };
}

export const auth = betterAuth({
  appName: "Finance Hub",
  baseURL: resolveBaseURL(),
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: trustedOrigins(),
  /**
   * OAuth failures (account_not_linked, state_mismatch, …) land on /login
   * with `?error=` instead of Better Auth’s default developer error page.
   */
  onAPIError: {
    errorURL: "/login",
  },
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    /**
     * Reset password (SPEC-01 FR-06 / SPEC-21).
     * Sends via Resend when `RESEND_API_KEY` is set. Failures are logged and
     * swallowed so the public request does not enumerate whether the email exists.
     */
    sendResetPassword: async ({ user, url, token }) => {
      const result = await sendPasswordResetEmail({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        url,
        token,
      });
      if (!result.ok) {
        console.error(
          `[auth] Password reset email failed for user ${user.id}: ${result.error}`,
        );
      }
    },
    revokeSessionsOnPasswordReset: true,
  },
  /** Google OAuth (SPEC-01). Omitted when credentials are missing (degradable). */
  socialProviders: googleSocialProviders,
  /**
   * Account linking 1.B: Google is trusted so a verified Google email can link
   * to an existing User even when Finance Hub `emailVerified` is still false.
   *
   * Better Auth defaults `requireLocalEmailVerified` to true — that rejects
   * linking for password users who never verified email (our common case) and
   * surfaces `account_not_linked`. Product decision 1.B turns that off.
   *
   * `updateUserInfoOnLink: false` preserves displayName / preferences.
   */
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      requireLocalEmailVerified: false,
      updateUserInfoOnLink: false,
    },
    /**
     * PWA / iOS Safari often drop the short-lived OAuth state cookie when the
     * flow leaves the app for accounts.google.com. State still lives in the
     * Verification table (single-use); skipping the cookie check avoids
     * `state_security_mismatch` when the DB record is valid.
     */
    skipStateCookieCheck: true,
  },
  user: {
    additionalFields: {
      displayName: {
        type: "string",
        required: false,
        input: true,
      },
      preferredCurrency: {
        type: "string",
        required: false,
        defaultValue: "ARS",
        input: false,
      },
      timezone: {
        type: "string",
        required: false,
        defaultValue: "America/Argentina/Buenos_Aires",
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  databaseHooks: {
    user: {
      create: {
        /**
         * Runs only when a User row is created (email signUp or first Google
         * login with a new email). Account linking to an existing User does
         * not create a User → this hook does not re-run (SPEC-01 T-08/T-12).
         */
        after: async (user) => {
          await createPersonalWorkspaceForUser({
            userId: user.id,
            userName: user.name ?? user.email,
          });
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type Auth = typeof auth;
