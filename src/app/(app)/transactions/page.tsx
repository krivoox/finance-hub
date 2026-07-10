import { ContentPanel } from "@/components/app-shell/content-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatSignedMoney } from "@/lib/format-money";
import { mockTransactions } from "@/mocks/transactions";

function amountVariant(type: "income" | "expense" | "transfer") {
  if (type === "income") return "income" as const;
  if (type === "expense") return "expense" as const;
  return "transfer" as const;
}

export default function TransactionsPage() {
  // TODO: replace with ListTransactions use case
  const transactions = mockTransactions;

  return (
    <ContentPanel
      title="Movimientos"
      description="Ingresos, gastos y transferencias."
      actions={<Button>Registrar</Button>}
    >
      <div className="mb-5">
        <Input
          type="search"
          placeholder="Buscar por descripción o cuenta…"
          className="max-w-md"
          aria-label="Buscar movimientos"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descripción</TableHead>
            <TableHead>Cuenta</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead className="text-right">Monto</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell className="font-medium text-foreground">
                {tx.description}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tx.accountName}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {tx.categoryName}
              </TableCell>
              <TableCell className="tabular-nums text-muted-foreground">
                {tx.date}
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={amountVariant(tx.type)} className="tabular-nums">
                  {formatSignedMoney(tx.amountCents)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ContentPanel>
  );
}
