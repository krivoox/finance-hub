"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { toast } from "sonner";

import { SurfaceSection } from "@/components/surface-section";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import { setActiveWorkspaceAction } from "@/features/workspaces/actions";
import { formatMoney } from "@/lib/format-money";
import { navigateAndRefresh } from "@/lib/navigation";

const MAX_AVATARS = 3;

export type GroupDirectoryCardProps = {
  workspaceId: string;
  name: string;
  currency: string;
  /** Current user's split net from `getGroupOverview.memberBalances`. */
  myNetCents: number | null;
  memberCount: number | null;
  members: readonly { userId: string; initials: string }[];
  lastActivity: { label: string; occurredOn: string } | null;
};

export function GroupDirectoryCard({
  workspaceId,
  name,
  currency,
  myNetCents,
  memberCount,
  members,
  lastActivity,
}: GroupDirectoryCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const visible = members.slice(0, MAX_AVATARS);
  const overflow =
    memberCount !== null ? memberCount - visible.length : 0;

  const handleOpen = () => {
    startTransition(async () => {
      const result = await setActiveWorkspaceAction({ workspaceId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      navigateAndRefresh(router, "/groups/activity");
    });
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      disabled={isPending}
      aria-label={`Abrir ${name}`}
      className="w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
    >
      <SurfaceSection className="transition-colors hover:bg-muted/40">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Users className="size-4" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-sm font-extrabold tracking-tight text-foreground">
              {name}
            </p>
            {lastActivity ? (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {lastActivity.label}
                <span className="text-border"> · </span>
                {lastActivity.occurredOn}
              </p>
            ) : memberCount !== null ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Sin actividad aún
              </p>
            ) : null}
          </div>
          {myNetCents !== null ? (
            <Badge
              variant={
                myNetCents > 0
                  ? "income"
                  : myNetCents < 0
                    ? "expense"
                    : "secondary"
              }
              className="shrink-0 tabular-nums"
            >
              {myNetCents > 0
                ? `Te deben ${formatMoney(myNetCents, currency)}`
                : myNetCents < 0
                  ? `Debés ${formatMoney(Math.abs(myNetCents), currency)}`
                  : "En paz"}
            </Badge>
          ) : null}
        </div>

        {members.length > 0 || memberCount !== null ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            {members.length > 0 ? (
              <AvatarGroup>
                {visible.map((member) => (
                  <Avatar key={member.userId} size="sm">
                    <AvatarFallback>{member.initials}</AvatarFallback>
                  </Avatar>
                ))}
                {overflow > 0 ? (
                  <AvatarGroupCount className="size-6 text-xs">
                    +{overflow}
                  </AvatarGroupCount>
                ) : null}
              </AvatarGroup>
            ) : (
              <span />
            )}
            {memberCount !== null ? (
              <p className="text-xs text-muted-foreground">
                {memberCount === 1 ? "1 miembro" : `${memberCount} miembros`}
              </p>
            ) : null}
          </div>
        ) : null}
      </SurfaceSection>
    </button>
  );
}
