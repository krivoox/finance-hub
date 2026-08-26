"use client";

import * as React from "react";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
  type RegisterOptions,
} from "react-hook-form";
import { Select as SelectPrimitive } from "radix-ui";
import { CheckIcon, ChevronDownIcon } from "lucide-react";

import { nativeSelectClassName } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

const EMPTY_VALUE = "__fh-empty__";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectProps = {
  id?: string;
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  options: readonly SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  "aria-label"?: string;
};

function toRadixValue(value: string): string {
  return value === "" ? EMPTY_VALUE : value;
}

function fromRadixValue(value: string): string {
  return value === EMPTY_VALUE ? "" : value;
}

export function Select({
  id,
  name,
  value,
  onValueChange,
  onBlur,
  options,
  placeholder = "Elegir",
  disabled = false,
  invalid = false,
  className,
  "aria-label": ariaLabel,
}: SelectProps) {
  const hasEmptyOption = options.some((option) => option.value === "");
  const radixValue =
    value === "" && !hasEmptyOption ? undefined : toRadixValue(value);

  return (
    <SelectPrimitive.Root
      value={radixValue}
      onValueChange={(next) => onValueChange(fromRadixValue(next))}
      disabled={disabled}
      name={name}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        onBlur={onBlur}
        className={cn(
          nativeSelectClassName,
          "items-center justify-between gap-2 text-left font-normal",
          "hover:border-ring/40 data-[state=open]:border-ring data-[state=open]:ring-3 data-[state=open]:ring-ring/50",
          "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
          "dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          "data-placeholder:text-muted-foreground [&_[data-placeholder]]:text-muted-foreground [&[data-state=open]_svg]:rotate-180",
          "*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:min-w-0",
          className,
        )}
      >
        <SelectPrimitive.Value
          data-slot="select-value"
          placeholder={placeholder}
        />
        <SelectPrimitive.Icon asChild>
          <ChevronDownIcon
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-150"
            aria-hidden
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          collisionPadding={12}
          className={cn(
            // FormSheet (Radix Dialog) sets pointer-events: none on the rest of
            // the document; portaled menus must opt back in.
            "pointer-events-auto z-[60] max-h-(--radix-select-content-available-height) w-(--radix-select-trigger-width) min-w-32 origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10",
            "duration-100 data-[side=bottom]:translate-y-1 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:-translate-x-1 data-[side=left]:slide-in-from-right-2 data-[side=right]:translate-x-1 data-[side=right]:slide-in-from-left-2 data-[side=top]:-translate-y-1 data-[side=top]:slide-in-from-bottom-2",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value || EMPTY_VALUE}
                value={toRadixValue(option.value)}
                disabled={option.disabled}
                className={cn(
                  "relative flex min-h-10 w-full cursor-default items-center gap-2 rounded-lg py-2 pr-8 pl-2 text-sm text-foreground outline-hidden select-none",
                  "hover:bg-muted/80 focus:bg-muted/80 data-highlighted:bg-muted/80",
                  "data-[state=checked]:bg-muted/60 data-[state=checked]:font-medium",
                  "data-disabled:pointer-events-none data-disabled:opacity-50",
                )}
              >
                <SelectPrimitive.ItemText>
                  <span className="min-w-0 truncate">{option.label}</span>
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                  <CheckIcon className="size-4 text-primary" aria-hidden />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

type FormSelectProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  rules?: RegisterOptions<TFieldValues, FieldPath<TFieldValues>>;
} & Omit<SelectProps, "value" | "onValueChange" | "onBlur">;

export function FormSelect<TFieldValues extends FieldValues>({
  control,
  name,
  rules,
  invalid,
  ...selectProps
}: FormSelectProps<TFieldValues>) {
  return (
    <Controller
      control={control}
      name={name}
      rules={rules}
      render={({ field, fieldState }) => (
        <Select
          {...selectProps}
          name={field.name}
          value={typeof field.value === "string" ? field.value : ""}
          onValueChange={field.onChange}
          onBlur={field.onBlur}
          invalid={invalid ?? fieldState.invalid}
        />
      )}
    />
  );
}
