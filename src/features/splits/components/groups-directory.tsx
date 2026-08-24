import { Suspense } from "react";

import { SurfaceSection } from "@/components/surface-section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateOnly } from "@/lib/format-date";
import { getGroupOverview } from "@/features/splits/services";
import { NotAGroupWorkspaceError } from "@/features/splits/domain";
import { NewGroupSheet } from "@/features/workspaces/components/new-group-sheet";
import type { WorkspaceSummary } from "@/features/workspaces/services";

import {
  GroupDirectoryCard,
  type GroupDirectoryCardProps,
} from "./group-directory-card";

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
  return letters.length > 0 ? letters : "?";
}

export function GroupsDirectory({
  userId,
  groups,
}: {
  userId: string;
  groups: readonly WorkspaceSummary[];
}) {
  if (groups.length === 0) {
    return (
      <SurfaceSection className="flex flex-col items-start gap-3 py-8 sm:py-10">
        <p className="text-sm text-muted-foreground">
          Todavía no tenés grupos. Creá uno para compartir gastos y ver
          balances.
        </p>
        <NewGroupSheet />
      </SurfaceSection>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="grid min-w-0 gap-3 sm:grid-cols-2">
        {groups.map((group) => (
          <li key={group.id} className="min-w-0">
            <Suspense fallback={<GroupCardSkeleton />}>
              <GroupDirectoryCardLoader
                userId={userId}
                workspaceId={group.id}
                fallbackName={group.name}
                fallbackCurrency={group.baseCurrency}
              />
            </Suspense>
          </li>
        ))}
      </ul>
      <NewGroupSheet
        trigger={
          <Button variant="outline" className="w-full border-dashed">
            Crear nuevo grupo
          </Button>
        }
      />
    </div>
  );
}

async function GroupDirectoryCardLoader({
  userId,
  workspaceId,
  fallbackName,
  fallbackCurrency,
}: {
  userId: string;
  workspaceId: string;
  fallbackName: string;
  fallbackCurrency: string;
}) {
  const overview = await getGroupOverview({ userId, workspaceId }).catch(
    (err: unknown) => {
      if (err instanceof NotAGroupWorkspaceError) return null;
      throw err;
    },
  );

  const props: GroupDirectoryCardProps = overview
    ? {
        workspaceId: overview.workspaceId,
        name: overview.name,
        currency: overview.currency,
        myNetCents:
          overview.memberBalances.find((member) => member.userId === userId)
            ?.netCents ?? null,
        memberCount: overview.members.length,
        members: overview.members.map((member) => ({
          userId: member.userId,
          initials: initialsFromName(member.displayName),
        })),
        lastActivity: overview.recentActivity[0]
          ? {
              label:
                overview.recentActivity[0].description ||
                overview.recentActivity[0].categoryName ||
                overview.recentActivity[0].type,
              occurredOn: formatDateOnly(overview.recentActivity[0].occurredOn),
            }
          : null,
      }
    : {
        workspaceId,
        name: fallbackName,
        currency: fallbackCurrency,
        myNetCents: null,
        memberCount: null,
        members: [],
        lastActivity: null,
      };

  return <GroupDirectoryCard {...props} />;
}

function GroupCardSkeleton() {
  return (
    <SurfaceSection aria-busy aria-label="Cargando grupo">
      <div className="flex items-start gap-3">
        <Skeleton className="size-10 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32 max-w-full" />
          <Skeleton className="h-3 w-40 max-w-full" />
        </div>
        <Skeleton className="h-6 w-24 shrink-0 rounded-full" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
    </SurfaceSection>
  );
}
