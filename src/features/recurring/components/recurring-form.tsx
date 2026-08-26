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
import { AmountInput } from "@/components/amount-input";
import { DateField } from "@/components/date-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  formatCentsAsAmountInput,
  parseAmountCents,
} from "@/domain/money/parse-amount";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/ui/select";
import { CategorySelectField } from "@/features/categories/components/category-select-field";
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
      amountUnits: initial ? formatCentsAsAmountInput(initial.amountCents) : "",
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
    const amountCents = parseAmountCents(values.amountUnits);
    if (amountCents === null) {
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
          <AmountInput
            id="rec-amount"
            aria-invalid={Boolean(errors.amountUnits)}
            {...register("amountUnits", { required: true })}
          />
        </FormField>

        <FormField
          label={type === "transfer" ? "Cuenta origen" : "Cuenta"}
          htmlFor="rec-account"
          error={errors.accountId?.message}
        >
          <FormSelect
            control={control}
            name="accountId"
            id="rec-account"
            rules={{ required: "Elegí una cuenta" }}
            invalid={Boolean(errors.accountId)}
            placeholder="Elegí una cuenta"
            options={[
              { value: "", label: "Elegí una cuenta" },
              ...accounts.map((a) => ({
                value: a.id,
                label: `${a.name} · ${a.currency}`,
              })),
            ]}
          />
        </FormField>

        {type === "transfer" ? (
          <FormField
            label="Cuenta destino"
            htmlFor="rec-counterparty"
            error={errors.counterpartyAccountId?.message}
          >
            <FormSelect
              control={control}
              name="counterpartyAccountId"
              id="rec-counterparty"
              invalid={Boolean(errors.counterpartyAccountId)}
              placeholder="Elegí una cuenta"
              options={[
                { value: "", label: "Elegí una cuenta" },
                ...counterpartyOptions.map((a) => ({
                  value: a.id,
                  label: `${a.name} · ${a.currency}`,
                })),
              ]}
            />
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
                  <CategorySelectField
                    id="rec-category"
                    kind={type === "income" ? "income" : "expense"}
                    workspaceId={workspaceId}
                    categories={categoryOptions}
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
