import { ContentPanel } from "@/components/app-shell/content-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format-money";

// TODO: replace with ListFinancialGroups / member balances — delete inline mock
const mockGroup = {
  name: "Hogar",
  members: [
    { id: "m1", name: "Ana", balanceCents: 12_500_00 },
    { id: "m2", name: "Luis", balanceCents: -12_500_00 },
  ],
};

export default function GroupsPage() {
  return (
    <ContentPanel
      title="Grupos"
      description="Gastos compartidos y balances entre miembros."
      actions={<Button>Invitar</Button>}
    >
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          {mockGroup.name}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Quién debe a quién en el grupo activo.
        </p>
      </div>

      <ul className="divide-y divide-border">
        {mockGroup.members.map((member) => (
          <li
            key={member.id}
            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
          >
            <p className="font-medium text-foreground">{member.name}</p>
            <Badge
              variant={member.balanceCents >= 0 ? "income" : "expense"}
              className="tabular-nums"
            >
              {member.balanceCents >= 0 ? "Le deben " : "Debe "}
              {formatMoney(Math.abs(member.balanceCents))}
            </Badge>
          </li>
        ))}
      </ul>
    </ContentPanel>
  );
}
