"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createSettlementAction } from "@/features/splits/actions";
import {
  FormActions,
  FormField,
  FormStack,
} from "@/components/form-sheet";
import { AmountInput } from "@/components/amount-input";
import { Button } from "@/components/ui/button";
import { parseAmountCents } from "@/domain/money/parse-amount";
import { Select } from "@/components/ui/select";
import { refreshAfterMutation } from "@/lib/navigation";

type MemberOption = {
  memberId: string;
  displayName: string;
  kind: "user" | "ghost";
};

function todayIsoDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function CreateSettlementForm({
  splitGroupId,
  members,
  actorMemberId,
  onSuccess,
}: {
  splitGroupId: string;
  members: readonly MemberOption[];
  actorMemberId: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const others = members.filter((m) => m.memberId !== actorMemberId);
  const [fromMemberId, setFromMemberId] = useState(others[0]?.memberId ?? "");
  const [amountUnits, setAmountUnits] = useState("");

  if (others.length === 0) return null;

  const handleSubmit = () => {
    const amountCents = parseAmountCents(amountUnits);
    if (amountCents === null) {
      toast.error("Poné un monto válido");
      return;
    }
    startTransition(async () => {
      const result = await createSettlementAction({
        splitGroupId,
        fromMemberId,
        toMemberId: actorMemberId,
        amountCents,
        occurredOn: todayIsoDate(),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Cobro anotado");
      setAmountUnits("");
      onSuccess?.();
      refreshAfterMutation(router);
    });
  };

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <FormStack>
        <FormField label="Quién pagó" htmlFor="settlement-from">
          <Select
            id="settlement-from"
            value={fromMemberId}
            onValueChange={setFromMemberId}
            options={others.map((member) => ({
              value: member.memberId,
              label: member.displayName,
            }))}
          />
        </FormField>
        <FormField label="Monto" htmlFor="settlement-amount" hint="Lo que te depositaron">
          <AmountInput
            id="settlement-amount"
            value={amountUnits}
            onChange={(event) => setAmountUnits(event.target.value)}
          />
        </FormField>
      </FormStack>
      <FormActions>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : "Anotar cobro"}
        </Button>
      </FormActions>
    </form>
  );
}
