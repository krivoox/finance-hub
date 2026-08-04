"use client";

import { useState } from "react";

import { FormSheet } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";

import { ContributeGoalForm } from "./contribute-goal-form";

type AccountOption = {
  id: string;
  name: string;
  currency: string;
};

type ContributeGoalSheetProps = {
  goalId: string;
  goalName: string;
  goalCurrency: string;
  linkedAccountId: string | null;
  linkedAccountName: string | null;
  accounts: readonly AccountOption[];
};

export function ContributeGoalSheet({
  goalId,
  goalName,
  goalCurrency,
  linkedAccountId,
  linkedAccountName,
  accounts,
}: ContributeGoalSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <FormSheet
      open={open}
      onOpenChange={setOpen}
      title="Aportar al objetivo"
      description={goalName}
      size="md"
      trigger={
        <Button
          variant="outline"
          className="h-10 w-full sm:h-8 sm:w-auto"
        >
          Aportar
        </Button>
      }
    >
      <ContributeGoalForm
        goalId={goalId}
        goalCurrency={goalCurrency}
        linkedAccountId={linkedAccountId}
        linkedAccountName={linkedAccountName}
        accounts={accounts}
        onSuccess={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </FormSheet>
  );
}
