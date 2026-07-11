import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { createPersonalWorkspaceForUser } from "@/features/workspaces/services/create-personal-workspace";

export const auth = betterAuth({
  appName: "Finance Hub",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    /**
     * Reset password (SPEC-01 FR-06).
     *
     * No SMTP configured yet. In development we log the URL so devs can copy it
     * from the terminal; in production the callback stays as a stub until an
     * email provider is wired. Better Auth still generates the token and
     * validates it in the DB, so the end-to-end flow works.
     */
    sendResetPassword: async ({ user, url, token }) => {
      if (env.NODE_ENV !== "production") {
        console.info(
          `[auth] Password reset requested for ${user.email}\n` +
            `  token: ${token}\n` +
            `  url:   ${url}`,
        );
      }
    },
    revokeSessionsOnPasswordReset: true,
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
