"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  changeMemberRoleAction,
  removeMemberAction,
  transferOwnershipAction,
} from "@/features/workspaces/actions";
import type { MembershipRole } from "@/features/workspaces/domain";
import { refreshAfterMutation } from "@/lib/navigation";

const ROLE_LABEL: Record<MembershipRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const ASSIGNABLE_ROLES: MembershipRole[] = ["admin", "member", "viewer"];

export type MembersManagementMember = {
  userId: string;
  role: MembershipRole;
  user: {
    email: string;
    name: string;
    displayName: string | null;
  };
};

type MembersManagementProps = {
  workspaceId: string;
  members: MembersManagementMember[];
  currentUserId: string;
  currentRole: MembershipRole;
};

function displayName(m: MembersManagementMember): string {
  return m.user.displayName?.trim() || m.user.name || m.user.email;
}

export function MembersManagement({
  workspaceId,
  members,
  currentUserId,
  currentRole,
}: MembersManagementProps) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canManage = currentRole === "owner" || currentRole === "admin";
  const canTransfer = currentRole === "owner";
  const ownerCount = members.filter((m) => m.role === "owner").length;

  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin miembros.</p>;
  }

  function run(
    key: string,
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    successMessage: string,
  ) {
    setPendingKey(key);
    startTransition(async () => {
      const result = await action();
      setPendingKey(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(successMessage);
      refreshAfterMutation(router);
    });
  }

  return (
    <ul className="divide-y divide-border">
      {members.map((m) => {
        const isSelf = m.userId === currentUserId;
        const isOwner = m.role === "owner";
        const adminBlockedOnOwner = currentRole === "admin" && isOwner;
        const canChangeRole =
          canManage &&
          !isSelf &&
          !adminBlockedOnOwner &&
          !(isOwner && ownerCount <= 1);
        const canRemove =
          canManage &&
          !isSelf &&
          !adminBlockedOnOwner &&
          !(isOwner && ownerCount <= 1);
        const canTransferTo =
          canTransfer && !isSelf && m.role !== "owner";

        const roleOptions: MembershipRole[] = isOwner
          ? ["owner", ...ASSIGNABLE_ROLES]
          : ASSIGNABLE_ROLES;

        return (
          <li
            key={m.userId}
            className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {displayName(m)}
                {isSelf ? (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    (vos)
                  </span>
                ) : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {m.user.email}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canChangeRole ? (
                <select
                  className="h-10 min-w-28 rounded-md border border-input bg-background px-2 text-sm sm:h-8"
                  value={m.role}
                  disabled={isPending && pendingKey === `role-${m.userId}`}
                  onChange={(e) => {
                    const role = e.target.value as MembershipRole;
                    run(
                      `role-${m.userId}`,
                      () =>
                        changeMemberRoleAction({
                          workspaceId,
                          userId: m.userId,
                          role,
                        }),
                      "Rol actualizado",
                    );
                  }}
                  aria-label={`Rol de ${displayName(m)}`}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </option>
                  ))}
                </select>
              ) : (
                <Badge variant="secondary" className="shrink-0">
                  {ROLE_LABEL[m.role] ?? m.role}
                </Badge>
              )}

              {canTransferTo ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10 sm:h-8"
                  disabled={isPending}
                  onClick={() =>
                    run(
                      `transfer-${m.userId}`,
                      () =>
                        transferOwnershipAction({
                          workspaceId,
                          newOwnerUserId: m.userId,
                        }),
                      "Ownership transferido",
                    )
                  }
                >
                  Hacer owner
                </Button>
              ) : null}

              {canRemove ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-10 text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-8"
                  disabled={isPending}
                  onClick={() =>
                    run(
                      `remove-${m.userId}`,
                      () =>
                        removeMemberAction({
                          workspaceId,
                          userId: m.userId,
                        }),
                      "Miembro removido",
                    )
                  }
                >
                  Remover
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
