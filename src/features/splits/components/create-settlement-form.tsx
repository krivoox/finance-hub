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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nativeSelectClassName } from "@/components/ui/native-select";
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
    const parsed = Number(amountUnits.replace(",", "."));
    const amountCents = Math.round(parsed * 100);
    if (!Number.isFinite(parsed) || amountCents <= 0) {
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
          <select
            id="settlement-from"
            className={nativeSelectClassName}
            value={fromMemberId}
            onChange={(event) => setFromMemberId(event.target.value)}
          >
            {others.map((member) => (
              <option key={member.memberId} value={member.memberId}>
                {member.displayName}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Monto" htmlFor="settlement-amount" hint="Lo que te depositaron">
          <Input
            id="settlement-amount"
            inputMode="decimal"
            value={amountUnits}
            onChange={(event) => setAmountUnits(event.target.value)}
            placeholder="0,00"
            className="tabular-nums"
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
