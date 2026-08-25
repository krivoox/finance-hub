"use client";

import { useMemo } from "react";
import Link from "next/link";

import { Checkbox } from "@/components/ui/checkbox";
import { nativeSelectClassName } from "@/components/ui/native-select";
import { formatMoney } from "@/lib/format-money";
import { previewEqualSplit } from "@/features/splits/domain";
import type { SplitGroupMemberRef } from "@/features/splits/domain";

export type ExpenseSplitGroupOption = {
  id: string;
  name: string;
  currency: string;
  memberCount: number;
  members: SplitGroupMemberRef[];
};

function typicalShareCents(preview: {
  shares: readonly { shareCents: number }[];
  baseCents: number;
}): number {
  const first = preview.shares[0]?.shareCents;
  const allEqual = preview.shares.every((s) => s.shareCents === first);
  return allEqual && first !== undefined ? first : preview.baseCents;
}

export function ExpenseSplitFields({
  enabled,
  onEnabledChange,
  groups,
  selectedGroupId,
  onGroupChange,
  amountCents,
  payerMemberId,
  currency,
}: {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
  groups: readonly ExpenseSplitGroupOption[];
  selectedGroupId: string;
  onGroupChange: (id: string) => void;
  amountCents: number | null;
  payerMemberId: string | null;
  currency: string;
}) {
  const groupsForCurrency = groups.filter((group) => group.currency === currency);
  const selected =
    groupsForCurrency.find((g) => g.id === selectedGroupId) ?? groupsForCurrency[0];
  const preview = useMemo(() => {
    if (!enabled || !selected || !amountCents || amountCents <= 0) return null;
    if (selected.members.length < 2 || !payerMemberId) return null;
    if (!selected.members.some((m) => m.memberId === payerMemberId)) return null;
    try {
      return previewEqualSplit({
        totalCents: amountCents,
        memberIds: selected.members.map((m) => m.memberId),
        payerMemberId,
      });
    } catch {
      return null;
    }
  }, [enabled, selected, amountCents, payerMemberId]);

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-border p-4">
        <p className="text-sm text-muted-foreground">
          Para dividirlo, primero{" "}
          <Link href="/groups" className="underline underline-offset-2">
            creá un grupo
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border p-4">
      <label className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-sm font-medium text-foreground">
            Dividirlo con alguien
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Se reparte en partes iguales entre los del grupo.
          </span>
        </span>
        <Checkbox
          checked={enabled}
          onCheckedChange={(value) => onEnabledChange(value === true)}
          aria-label="Dividirlo con alguien"
        />
      </label>

      {enabled ? (
        <>
          {groupsForCurrency.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay grupos en {currency}. Creá uno o cambiá la moneda del
              gasto.
            </p>
          ) : (
            <select
              className={nativeSelectClassName}
              value={selected?.id ?? ""}
              onChange={(event) => onGroupChange(event.target.value)}
              aria-label="Grupo"
            >
              {groupsForCurrency.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          )}
          {selected && selected.members.length < 2 ? (
            <p className="text-sm text-muted-foreground">
              Sumá a alguien en «{selected.name}» para poder dividir.
            </p>
          ) : null}
          {preview && selected ? (
            <p className="text-sm text-muted-foreground">
              En «{selected.name}», entre {preview.participantCount}: le toca{" "}
              {formatMoney(typicalShareCents(preview), currency)} a cada uno. Vos
              pusiste todo, así que te deben el resto.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
