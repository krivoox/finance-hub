"use client";

import { useEffect } from "react";
import { rememberInviteTokenAction } from "@/features/workspaces/actions";

/**
 * Persists the invite token in an httpOnly cookie via Server Action.
 * Must run on the client — RSC pages cannot call `cookies().set()`.
 */
export function RememberInviteToken({ token }: { token: string }) {
  useEffect(() => {
    void rememberInviteTokenAction(token);
  }, [token]);

  return null;
}
