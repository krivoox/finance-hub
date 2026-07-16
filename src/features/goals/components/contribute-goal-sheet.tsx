"use client";

import { useState } from "react";

import { FormSheet } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";

import { ContributeGoalForm } from "./contribute-goal-form";

type ContributeGoalSheetProps = {
  goalId: string;
  goalName: string;
  goalCurrency: string;
};

export function ContributeGoalSheet({
  goalId,
  goalName,
  goalCurrency,
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
        onSuccess={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </FormSheet>
  );
}
