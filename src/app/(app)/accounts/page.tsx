import { ContentPanel } from "@/components/app-shell/content-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/format-money";
import { mockAccounts } from "@/mocks/accounts";

const typeLabel: Record<(typeof mockAccounts)[number]["type"], string> = {
  checking: "Cuenta",
  savings: "Ahorro",
  credit: "Crédito",
  cash: "Efectivo",
  wallet: "Billetera",
};

export default function AccountsPage() {
  // TODO: replace with ListAccounts use case
  const accounts = mockAccounts;

  return (
    <ContentPanel
      title="Cuentas"
      description="Saldos de bancos, billeteras y tarjetas."
      actions={<Button>Nueva cuenta</Button>}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cuenta</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Saldo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-foreground">
                    {account.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {account.institution}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{typeLabel[account.type]}</Badge>
              </TableCell>
              <TableCell
                className={`text-right font-medium tabular-nums ${
                  account.balanceCents < 0 ? "text-expense" : "text-foreground"
                }`}
              >
                {formatMoney(account.balanceCents, account.currency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ContentPanel>
  );
}
