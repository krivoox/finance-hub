import "server-only";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export type CurrentUserProfile = {
  id: string;
  email: string;
  name: string;
  displayName: string | null;
  preferredCurrency: string;
  timezone: string;
  emailVerified: boolean;
  image: string | null;
};

/**
 * Returns the currently authenticated user's profile, or `null` if
 * there is no active session (SPEC-01 GetCurrentUser).
 */
export async function getCurrentUser(): Promise<CurrentUserProfile | null> {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      displayName: true,
      preferredCurrency: true,
      timezone: true,
      emailVerified: true,
      image: true,
    },
  });

  return user;
}
