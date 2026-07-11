"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildInviteUrlClient } from "@/features/workspaces/components/invite-url";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export type PendingInvitationRow = {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresOn: string;
};

export function PendingInvitationsList({
  invitations,
  appBaseUrl,
}: {
  invitations: PendingInvitationRow[];
  appBaseUrl: string;
}) {
  if (invitations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay invitaciones pendientes.
      </p>
    );
  }

  async function copy(token: string) {
    const url = buildInviteUrlClient(appBaseUrl, token);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  return (
    <ul className="divide-y divide-border">
      {invitations.map((inv) => (
        <li
          key={inv.id}
          className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
        >
          <div>
            <p className="font-medium text-foreground">{inv.email}</p>
            <p className="text-xs text-muted-foreground">
              Expira {inv.expiresOn}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {ROLE_LABEL[inv.role] ?? inv.role}
            </Badge>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void copy(inv.token)}
            >
              Copiar link
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
