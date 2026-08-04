"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { FormSheet } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";

import { EditBudgetForm } from "./edit-budget-form";

type CategoryOption = {
  id: string;
  name: string;
};

type EditBudgetSheetProps = {
  budgetId: string;
  name: string;
  limitCents: number;
  currency: string;
  categoryIds: readonly string[];
  categories: readonly CategoryOption[];
};

export function EditBudgetSheet({
  budgetId,
  name,
  limitCents,
  currency,
  categoryIds,
  categories,
}: EditBudgetSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <FormSheet
      open={open}
      onOpenChange={setOpen}
      title="Editar presupuesto"
      description="Podés cambiar nombre, límite y categorías. El periodo no se modifica."
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
      <EditBudgetForm
        budgetId={budgetId}
        name={name}
        limitCents={limitCents}
        currency={currency}
        categoryIds={categoryIds}
        categories={categories}
        onSuccess={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </FormSheet>
  );
}
