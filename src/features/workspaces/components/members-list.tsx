import { Badge } from "@/components/ui/badge";
import type { WorkspaceMember } from "@/features/workspaces/services";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export function MembersList({ members }: { members: WorkspaceMember[] }) {
  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin miembros.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {members.map((m) => {
        const name =
          m.user.displayName?.trim() || m.user.name || m.user.email;
        return (
          <li
            key={m.userId}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <div>
              <p className="font-medium text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground">{m.user.email}</p>
            </div>
            <Badge variant="secondary">{ROLE_LABEL[m.role] ?? m.role}</Badge>
          </li>
        );
      })}
    </ul>
  );
}
