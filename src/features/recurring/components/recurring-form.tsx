"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
  FormActions,
  FormField,
  FormStack,
  SegmentedControl,
} from "@/components/form-sheet";
import { DateField } from "@/components/date-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { nativeSelectClassName } from "@/components/ui/native-select";
import { CategoryPicker } from "@/features/categories/components/category-picker";
import { refreshAfterMutation } from "@/lib/navigation";
import {
  createRecurringRuleAction,
  updateRecurringRuleAction,
} from "@/features/recurring/actions";
import {
  createRecurringRuleSchema,
  updateRecurringRuleSchema,
  type CreateRecurringRuleInput,
  type UpdateRecurringRuleInput,
} from "@/features/recurring/schemas";
import {
  RECURRING_FREQUENCIES,
  RECURRING_RULE_TYPES,
  addDays,
  computeOccurrences,
  todayDateOnly,
  type DateOnly,
  type RecurringFrequency,
  type RecurringRuleType,
} from "@/features/recurring/domain";

import {
  RECURRING_FREQUENCY_LABEL_ES,
  RECURRING_TYPE_LABEL_ES,
} from "./labels";

const SELECT_CLASSES = nativeSelectClassName;

const TYPE_OPTIONS = RECURRING_RULE_TYPES.map((value) => ({
  value,
  label: RECURRING_TYPE_LABEL_ES[value],
}));

const FREQUENCY_OPTIONS = RECURRING_FREQUENCIES.map((value) => ({
  value,
  label: RECURRING_FREQUENCY_LABEL_ES[value],
}));

export type AccountOption = {
  id: string;
  name: string;
  currency: string;
};

export type CategoryOption = {
  id: string;
  name: string;
  kind: "income" | "expense";
};

type FormValues = {
  name: string;
  type: RecurringRuleType;
  amountUnits: string;
  accountId: string;
  counterpartyAccountId: string;
  categoryId: string;
  description: string;
  frequency: RecurringFrequency;
  startDate: string;
  endDate: string;
};

type CommonProps = {
  workspaceId: string;
  workspaceCurrency: string;
  accounts: readonly AccountOption[];
  categories: readonly CategoryOption[];
  onSuccess?: () => void;
  onCancel?: () => void;
};

export type RecurringFormMode =
  | { kind: "create"; initial?: never }
  | {
      kind: "edit";
      initial: {
        ruleId: string;
        name: string;
        type: RecurringRuleType;
        amountCents: number;
        currency: string;
        accountId: string;
        counterpartyAccountId: string | null;
        categoryId: string | null;
        description: string | null;
        frequency: RecurringFrequency;
        startDate: DateOnly;
        endDate: DateOnly | null;
      };
    };

type RecurringFormProps = CommonProps & { mode: RecurringFormMode };

function centsToUnits(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function RecurringForm({
  mode,
  workspaceId,
  workspaceCurrency,
  accounts,
  categories,
  onSuccess,
  onCancel,
}: RecurringFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isEdit = mode.kind === "edit";
  const initial = mode.kind === "edit" ? mode.initial : undefined;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: initial?.name ?? "",
      type: initial?.type ?? "expense",
      amountUnits: initial ? centsToUnits(initial.amountCents) : "",
      accountId: initial?.accountId ?? "",
      counterpartyAccountId: initial?.counterpartyAccountId ?? "",
      categoryId: initial?.categoryId ?? "",
      description: initial?.description ?? "",
      frequency: initial?.frequency ?? "monthly",
      startDate: initial?.startDate ?? todayDateOnly(new Date(), "UTC"),
      endDate: initial?.endDate ?? "",
    },
  });

  const type = useWatch({ control, name: "type" });
  const accountId = useWatch({ control, name: "accountId" });
  const frequency = useWatch({ control, name: "frequency" });
  const startDate = useWatch({ control, name: "startDate" });
  const endDate = useWatch({ control, name: "endDate" });

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? null,
    [accounts, accountId],
  );
  const currency = selectedAccount?.currency ?? workspaceCurrency;

  const counterpartyOptions = useMemo(
    () =>
      accounts.filter(
        (a) => a.id !== accountId && a.currency === currency,
      ),
    [accounts, accountId, currency],
  );

  const categoryOptions = useMemo(() => {
    if (type === "transfer") return [];
    return categories.filter((c) => c.kind === type);
  }, [categories, type]);

  const previewDates = useMemo(() => {
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return [];
    const from = startDate;
    const to = addDays(from, 366);
    const hits = computeOccurrences(
      {
        frequency,
        startDate: from,
        endDate:
          endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate) ? endDate : null,
        status: "active",
      },
      from,
      to,
    );
    return hits.slice(0, 3);
  }, [frequency, startDate, endDate]);

  const onSubmit = handleSubmit((values) => {
    const parsedUnits = Number(values.amountUnits.replace(",", "."));
    if (!Number.isFinite(parsedUnits) || parsedUnits <= 0) {
      toast.error("Monto inválido");
      return;
    }
    const amountCents = Math.round(parsedUnits * 100);
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      toast.error("Monto inválido");
      return;
    }

    const description = values.description.trim() || null;
    const endDateValue = values.endDate.trim() || null;

    startTransition(async () => {
      if (isEdit && initial) {
        const input: UpdateRecurringRuleInput = {
          ruleId: initial.ruleId,
          name: values.name,
          amountCents,
          accountId: values.accountId,
          counterpartyAccountId:
            values.type === "transfer"
              ? values.counterpartyAccountId || null
              : null,
          categoryId:
            values.type === "transfer" ? null : values.categoryId || null,
          description,
          frequency: values.frequency,
          startDate: values.startDate,
          endDate: endDateValue,
        };
        const check = updateRecurringRuleSchema.safeParse(input);
        if (!check.success) {
          toast.error(check.error.issues[0]?.message ?? "Datos inválidos");
          return;
        }
        const result = await updateRecurringRuleAction(check.data);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Recurrente actualizada");
        onSuccess?.();
        refreshAfterMutation(router);
        return;
      }

      const input: CreateRecurringRuleInput = {
        workspaceId,
        name: values.name,
        type: values.type,
        amountCents,
        accountId: values.accountId,
        counterpartyAccountId:
          values.type === "transfer"
            ? values.counterpartyAccountId || null
            : null,
        categoryId:
          values.type === "transfer" ? null : values.categoryId || null,
        description,
        frequency: values.frequency,
        startDate: values.startDate,
        endDate: endDateValue,
      };
      const check = createRecurringRuleSchema.safeParse(input);
      if (!check.success) {
        toast.error(check.error.issues[0]?.message ?? "Datos inválidos");
        return;
      }
      const result = await createRecurringRuleAction(check.data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Recurrente creada");
      onSuccess?.();
      refreshAfterMutation(router);
    });
  });

  const isBusy = isPending || isSubmitting;

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <FormStack>
        <FormField label="Nombre" htmlFor="rec-name" error={errors.name?.message}>
          <Input
            id="rec-name"
            placeholder="Alquiler, Netflix, Sueldo…"
            aria-invalid={Boolean(errors.name)}
            {...register("name", { required: "Nombre requerido" })}
          />
        </FormField>

        {!isEdit ? (
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <FormField label="Tipo" htmlFor="rec-type">
                <SegmentedControl
                  id="rec-type"
                  ariaLabel="Tipo de recurrente"
                  value={field.value}
                  options={TYPE_OPTIONS}
                  disabled={isBusy}
                  onChange={field.onChange}
                />
              </FormField>
            )}
          />
        ) : (
          <FormField label="Tipo" htmlFor="rec-type-locked">
            <div
              id="rec-type-locked"
              className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
            >
              {RECURRING_TYPE_LABEL_ES[type]} · no se puede cambiar
            </div>
          </FormField>
        )}

        <FormField
          label="Monto"
          htmlFor="rec-amount"
          hint={`En ${currency}`}
          error={errors.amountUnits?.message}
        >
          <Input
            id="rec-amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="0,00"
            className="tabular-nums"
            aria-invalid={Boolean(errors.amountUnits)}
            {...register("amountUnits", { required: true })}
          />
        </FormField>

        <FormField
          label={type === "transfer" ? "Cuenta origen" : "Cuenta"}
          htmlFor="rec-account"
          error={errors.accountId?.message}
        >
          <select
            id="rec-account"
            className={SELECT_CLASSES}
            aria-invalid={Boolean(errors.accountId)}
            {...register("accountId", { required: "Elegí una cuenta" })}
          >
            <option value="">Elegí una cuenta</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.currency}
              </option>
            ))}
          </select>
        </FormField>

        {type === "transfer" ? (
          <FormField
            label="Cuenta destino"
            htmlFor="rec-counterparty"
            error={errors.counterpartyAccountId?.message}
          >
            <select
              id="rec-counterparty"
              className={SELECT_CLASSES}
              aria-invalid={Boolean(errors.counterpartyAccountId)}
              {...register("counterpartyAccountId")}
            >
              <option value="">Elegí una cuenta</option>
              {counterpartyOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.currency}
                </option>
              ))}
            </select>
          </FormField>
        ) : (
          <FormField
            label="Categoría"
            htmlFor="rec-category"
            error={errors.categoryId?.message}
          >
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <CategoryPicker
                  mode="single"
                  id="rec-category"
                  categories={categoryOptions.map((c) => ({
                    id: c.id,
                    name: c.name,
                  }))}
                  value={field.value || null}
                  onChange={(id) => field.onChange(id ?? "")}
                  disabled={isPending}
                  aria-invalid={Boolean(errors.categoryId)}
                  placeholder="Elegir categoría"
                />
              )}
            />
          </FormField>
        )}

        <FormField
          label="Descripción"
          htmlFor="rec-description"
          optional
          error={errors.description?.message}
        >
          <Textarea
            id="rec-description"
            rows={2}
            placeholder="Detalle opcional"
            {...register("description")}
          />
        </FormField>

        <Controller
          control={control}
          name="frequency"
          render={({ field }) => (
            <FormField label="Frecuencia" htmlFor="rec-frequency">
              <SegmentedControl
                id="rec-frequency"
                ariaLabel="Frecuencia"
                value={field.value}
                options={FREQUENCY_OPTIONS}
                disabled={isBusy}
                onChange={field.onChange}
              />
            </FormField>
          )}
        />

        <FormField
          label="Primera fecha"
          htmlFor="rec-start"
          error={errors.startDate?.message}
        >
          <Controller
            control={control}
            name="startDate"
            rules={{ required: "Fecha requerida" }}
            render={({ field }) => (
              <DateField
                id="rec-start"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={Boolean(errors.startDate)}
              />
            )}
          />
        </FormField>

        <FormField
          label="Última fecha"
          htmlFor="rec-end"
          optional
          hint="Vacío = sin fin"
        >
          <Controller
            control={control}
            name="endDate"
            render={({ field }) => (
              <DateField
                id="rec-end"
                name={field.name}
                clearable
                placeholder="Sin fin"
                min={startDate || undefined}
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </FormField>

        {previewDates.length > 0 ? (
          <div className="rounded-lg border border-dashed border-border px-3 py-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Próximas fechas
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground tabular-nums">
              {previewDates.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </FormStack>

      <FormActions>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isBusy}
            onClick={onCancel}
          >
            Cancelar
          </Button>
        ) : null}
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={isBusy}
        >
          {isBusy
            ? isEdit
              ? "Guardando…"
              : "Creando…"
            : isEdit
              ? "Guardar cambios"
              : "Crear recurrente"}
        </Button>
      </FormActions>
    </form>
  );
}
