"use client";

import { useState } from "react";

import { FormSheet } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { CreateSettlementForm } from "./create-settlement-form";

type MemberOption = {
  memberId: string;
  displayName: string;
  kind: "user" | "ghost";
};

export function CreateSettlementSheet({
  splitGroupId,
  members,
  actorMemberId,
}: {
  splitGroupId: string;
  members: readonly MemberOption[];
  actorMemberId: string;
}) {
  const [open, setOpen] = useState(false);
  const others = members.filter((m) => m.memberId !== actorMemberId);
  if (others.length === 0) return null;

  return (
    <FormSheet
      open={open}
      onOpenChange={setOpen}
      title="Anotar un cobro"
      description="Registrá que alguien te devolvió su parte. No mueve tus cuentas: sólo el saldo del grupo."
      size="md"
      trigger={
        <Button type="button" variant="outline" className="w-full sm:w-auto">
          Anotar cobro
        </Button>
      }
    >
      <CreateSettlementForm
        splitGroupId={splitGroupId}
        members={members}
        actorMemberId={actorMemberId}
        onSuccess={() => setOpen(false)}
      />
    </FormSheet>
  );
}
