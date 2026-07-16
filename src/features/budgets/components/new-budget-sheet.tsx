"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { FormSheet } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";

import { NewBudgetForm } from "./new-budget-form";

type CategoryOption = {
  id: string;
  name: string;
};

type NewBudgetSheetProps = {
  workspaceId: string;
  workspaceCurrency: string;
  categories: readonly CategoryOption[];
};

export function NewBudgetSheet({
  workspaceId,
  workspaceCurrency,
  categories,
}: NewBudgetSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <FormSheet
      open={open}
      onOpenChange={setOpen}
      title="Nuevo presupuesto"
      description={`Definí un límite periódico en ${workspaceCurrency}.`}
      size="md"
      trigger={
        <Button className="h-10 w-full gap-1.5 sm:h-8 sm:w-auto">
          <Plus className="size-4" strokeWidth={1.75} />
          Nuevo presupuesto
        </Button>
      }
    >
      <NewBudgetForm
        workspaceId={workspaceId}
        workspaceCurrency={workspaceCurrency}
        categories={categories}
        onSuccess={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </FormSheet>
  );
}
