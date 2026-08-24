"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";

import { FormSheet } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";

import { NewGroupWorkspaceForm } from "./new-group-workspace-form";

type NewGroupSheetProps = {
  trigger?: ReactNode;
};

export function NewGroupSheet({ trigger }: NewGroupSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <FormSheet
      open={open}
      onOpenChange={setOpen}
      title="Nuevo grupo"
      description="Un espacio compartido para gastos y balances del hogar."
      size="md"
      trigger={
        trigger ?? (
          <Button className="w-full gap-1.5 sm:w-auto">
            <Plus className="size-4" strokeWidth={1.75} />
            Nuevo grupo
          </Button>
        )
      }
    >
      <NewGroupWorkspaceForm
        successHref="/groups/activity"
        onSuccess={() => setOpen(false)}
      />
    </FormSheet>
  );
}
