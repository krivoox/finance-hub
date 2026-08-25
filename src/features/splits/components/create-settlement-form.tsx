"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createSettlementAction } from "@/features/splits/actions";
import { FormField } from "@/components/form-sheet";
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
}: {
  splitGroupId: string;
  members: readonly MemberOption[];
  actorMemberId: string;
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
      toast.success("Saldado");
      setAmountUnits("");
      refreshAfterMutation(router);
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Ya me pagó</p>
      <FormField label="Quién" htmlFor="settlement-from">
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
      <FormField label="Monto" htmlFor="settlement-amount">
        <Input
          id="settlement-amount"
          inputMode="decimal"
          value={amountUnits}
          onChange={(event) => setAmountUnits(event.target.value)}
          placeholder="0,00"
        />
      </FormField>
      <Button
        type="button"
        variant="outline"
        className="h-11 rounded-xl"
        disabled={isPending}
        onClick={handleSubmit}
      >
        Registrar que me pagaron
      </Button>
    </div>
  );
}
