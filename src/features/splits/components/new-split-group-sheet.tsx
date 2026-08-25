"use client";

import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";

import { FormSheet } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { NewSplitGroupForm } from "./new-split-group-form";

type NewSplitGroupSheetProps = {
  trigger?: ReactNode;
};

export function NewSplitGroupSheet({ trigger }: NewSplitGroupSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <FormSheet
      open={open}
      onOpenChange={setOpen}
      title="Un grupo nuevo"
      description="Para el asado, la casa o el súper. Los gastos se cargan después, al registrar un movimiento."
      size="md"
      trigger={
        trigger ?? (
          <Button className="h-11 w-full rounded-xl sm:w-auto">
            <Plus className="size-4" strokeWidth={1.75} />
            Crear un grupo
          </Button>
        )
      }
    >
      <NewSplitGroupForm onSuccess={() => setOpen(false)} />
    </FormSheet>
  );
}
