"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { FormSheet } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";

import {
  RecurringForm,
  type AccountOption,
  type CategoryOption,
} from "./recurring-form";

type NewRecurringSheetProps = {
  workspaceId: string;
  workspaceCurrency: string;
  accounts: readonly AccountOption[];
  categories: readonly CategoryOption[];
  /** Controlled open (optional). When omitted, manages its own state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

export function NewRecurringSheet({
  workspaceId,
  workspaceCurrency,
  accounts,
  categories,
  open: openControlled,
  onOpenChange: onOpenChangeControlled,
  showTrigger = true,
}: NewRecurringSheetProps) {
  const [openUncontrolled, setOpenUncontrolled] = useState(false);
  const isControlled = openControlled !== undefined;
  const open = isControlled ? openControlled : openUncontrolled;
  const setOpen = isControlled
    ? (onOpenChangeControlled ?? (() => undefined))
    : setOpenUncontrolled;

  return (
    <FormSheet
      open={open}
      onOpenChange={setOpen}
      title="Nueva recurrente"
      description="Ingreso, gasto o transferencia que se repite en el tiempo."
      size="lg"
      trigger={
        showTrigger ? (
          <Button className="h-10 w-full gap-1.5 sm:h-8 sm:w-auto">
            <Plus className="size-4" strokeWidth={1.75} />
            Nueva recurrente
          </Button>
        ) : undefined
      }
    >
      <RecurringForm
        mode={{ kind: "create" }}
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
