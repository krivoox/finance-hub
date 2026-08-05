"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { FormSheet } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";

import {
  RecurringForm,
  type AccountOption,
  type CategoryOption,
  type RecurringFormMode,
} from "./recurring-form";

type EditRecurringSheetProps = {
  workspaceId: string;
  workspaceCurrency: string;
  accounts: readonly AccountOption[];
  categories: readonly CategoryOption[];
  initial: Extract<RecurringFormMode, { kind: "edit" }>["initial"];
};

export function EditRecurringSheet({
  workspaceId,
  workspaceCurrency,
  accounts,
  categories,
  initial,
}: EditRecurringSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <FormSheet
      open={open}
      onOpenChange={setOpen}
      title="Editar recurrente"
      description="El tipo y la moneda no se pueden cambiar."
      size="lg"
      trigger={
        <Button variant="outline" className="h-10 w-full gap-1.5 sm:h-8 sm:w-auto">
          <Pencil className="size-4" strokeWidth={1.75} />
          Editar
        </Button>
      }
    >
      <RecurringForm
        mode={{ kind: "edit", initial }}
        workspaceId={workspaceId}
        workspaceCurrency={workspaceCurrency}
        accounts={accounts}
        categories={categories}
        onSuccess={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </FormSheet>
  );
}
