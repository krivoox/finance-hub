"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { FormSheet } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";

import { NewGoalForm } from "./new-goal-form";

type AccountOption = {
  id: string;
  name: string;
};

type NewGoalSheetProps = {
  workspaceId: string;
  workspaceCurrency: string;
  accounts: readonly AccountOption[];
};

export function NewGoalSheet({
  workspaceId,
  workspaceCurrency,
  accounts,
}: NewGoalSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <FormSheet
      open={open}
      onOpenChange={setOpen}
      title="Nuevo objetivo"
      description={`Ahorro o pago de deuda en ${workspaceCurrency}.`}
      size="md"
      trigger={
        <Button className="h-10 w-full gap-1.5 sm:h-8 sm:w-auto">
          <Plus className="size-4" strokeWidth={1.75} />
          Nuevo objetivo
        </Button>
      }
    >
      <NewGoalForm
        workspaceId={workspaceId}
        workspaceCurrency={workspaceCurrency}
        accounts={accounts}
        onSuccess={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </FormSheet>
  );
}
