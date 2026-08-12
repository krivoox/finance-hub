"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";

import { FormSheet } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import type { AccountType } from "@/features/accounts/domain";

import { EditAccountForm } from "./edit-account-form";

type EditAccountSheetProps = {
  accountId: string;
  name: string;
  type: AccountType;
  currency: string;
  creditLimitCents: number | null;
};

export function EditAccountSheet({
  accountId,
  name,
  type,
  currency,
  creditLimitCents,
}: EditAccountSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <FormSheet
      open={open}
      onOpenChange={setOpen}
      title="Editar cuenta"
      description={
        type === "credit_card"
          ? "Podés cambiar el nombre y el límite de crédito. La moneda no se modifica."
          : "Podés cambiar el nombre. La moneda no se modifica."
      }
      size="md"
      trigger={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-10 gap-1.5 sm:h-8"
        >
          <Pencil className="size-3.5" strokeWidth={1.75} />
          Editar
        </Button>
      }
    >
      <EditAccountForm
        accountId={accountId}
        name={name}
        type={type}
        currency={currency}
        creditLimitCents={creditLimitCents}
        onSuccess={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </FormSheet>
  );
}
