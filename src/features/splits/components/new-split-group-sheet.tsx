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
      description="Los gastos se cargan al registrar un movimiento, sobre tus cuentas."
      size="md"
      trigger={
        trigger ?? (
          <Button className="w-full gap-1.5 sm:w-auto">
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
