"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { FormSheet } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import type { TransactionType } from "@/features/transactions/domain";

import { EditTransactionForm } from "./edit-transaction-form";

type AccountOption = { id: string; name: string; currency: string };
type CategoryOption = { id: string; name: string; kind: "income" | "expense" };

type EditTransactionSheetProps = {
  transactionId: string;
  type: TransactionType;
  amountCents: number;
  currency: string;
  occurredOn: string;
  description: string | null;
  categoryId: string | null;
  accountId: string;
  counterpartyAccountId: string | null;
  accounts: readonly AccountOption[];
  categories: readonly CategoryOption[];
};

export function EditTransactionSheet({
  transactionId,
  type,
  amountCents,
  currency,
  occurredOn,
  description,
  categoryId,
  accountId,
  counterpartyAccountId,
  accounts,
  categories,
}: EditTransactionSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <FormSheet
      open={open}
      onOpenChange={setOpen}
      title="Editar movimiento"
      description="Actualizá monto, fecha, cuenta o categoría."
      size="md"
      trigger={
        <Button
          variant="outline"
          className="h-10 w-full gap-1.5 sm:h-8 sm:w-auto"
        >
          <Pencil className="size-4" strokeWidth={1.75} />
          Editar
        </Button>
      }
    >
      <EditTransactionForm
        transactionId={transactionId}
        type={type}
        amountCents={amountCents}
        currency={currency}
        occurredOn={occurredOn}
        description={description}
        categoryId={categoryId}
        accountId={accountId}
        counterpartyAccountId={counterpartyAccountId}
        accounts={accounts}
        categories={categories}
        onSuccess={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </FormSheet>
  );
}
