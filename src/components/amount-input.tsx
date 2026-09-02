"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { normalizeDecimalInput } from "@/domain/money/parse-amount";
import { cn } from "@/lib/utils";

export type AmountInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "inputMode" | "pattern" | "min" | "max" | "step"
> & {
  /** Fraction digits kept while typing. Money amounts use 2. */
  maxFractionDigits?: number;
  /** Keep a leading minus (balance targets that may be overdrawn). */
  allowNegative?: boolean;
};

/**
 * Amount / decimal field: `type="text"` + `inputMode="decimal"` so mobile
 * opens a numeric keypad, and a single comma decimal (KRI-33). Period
 * keystrokes are normalized to comma so iOS and Android behave the same.
 */
export function AmountInput({
  className,
  onChange,
  maxFractionDigits = 2,
  allowNegative = false,
  placeholder = "0,00",
  autoComplete = "off",
  ...props
}: AmountInputProps) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      enterKeyHint="done"
      autoComplete={autoComplete}
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={false}
      lang="es-AR"
      placeholder={placeholder}
      className={cn("tabular-nums", className)}
      onChange={(event) => {
        const next = normalizeDecimalInput(event.target.value, {
          maxFractionDigits,
          allowNegative,
        });
        if (event.target.value !== next) {
          event.target.value = next;
        }
        onChange?.(event);
      }}
    />
  );
}
