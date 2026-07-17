"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { FormSheet } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";

import { NewAccountForm } from "./new-account-form";

type NewAccountSheetProps = {
  workspaceId: string;
  workspaceCurrency: string;
};

export function NewAccountSheet({
  workspaceId,
  workspaceCurrency,
}: NewAccountSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <FormSheet
      open={open}
      onOpenChange={setOpen}
      title="Nueva cuenta"
      description={`Pesos (ARS) o dólares (USD). Default: ${workspaceCurrency}.`}
      size="md"
      trigger={
        <Button className="h-10 w-full gap-1.5 sm:h-8 sm:w-auto">
          <Plus className="size-4" strokeWidth={1.75} />
          Nueva cuenta
        </Button>
      }
    >
      <NewAccountForm
        workspaceId={workspaceId}
        workspaceCurrency={workspaceCurrency}
        onSuccess={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </FormSheet>
  );
}
