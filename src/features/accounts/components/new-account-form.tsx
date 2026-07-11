"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createAccountAction } from "@/features/accounts/actions";
import {
  createAccountSchema,
  type CreateAccountInput,
} from "@/features/accounts/schemas";
import { ACCOUNT_TYPES, type AccountType } from "@/features/accounts/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ACCOUNT_TYPE_LABEL_ES } from "./account-type-labels";

type FormValues = {
  name: string;
  type: AccountType;
  initialBalanceUnits: string;
};

type NewAccountFormProps = {
  workspaceId: string;
  workspaceCurrency: string;
};

export function NewAccountForm({
  workspaceId,
  workspaceCurrency,
}: NewAccountFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      type: "checking",
      initialBalanceUnits: "0",
    },
  });

  const onSubmit = handleSubmit((values) => {
    const parsedUnits = Number(values.initialBalanceUnits.replace(",", "."));
    if (!Number.isFinite(parsedUnits) || parsedUnits < 0) {
      toast.error("Saldo inicial inválido");
      return;
    }

    const initialBalanceCents = Math.round(parsedUnits * 100);

    const input: CreateAccountInput = {
      workspaceId,
      name: values.name,
      type: values.type,
      initialBalanceCents,
    };
    const clientCheck = createAccountSchema.safeParse(input);
    if (!clientCheck.success) {
      toast.error(clientCheck.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }

    startTransition(async () => {
      const result = await createAccountAction(clientCheck.data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Cuenta creada");
      reset({ name: "", type: "checking", initialBalanceUnits: "0" });
      router.refresh();
    });
  });

  const isBusy = isPending || isSubmitting;

  return (
    <form className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <label
          htmlFor="account-name"
          className="text-sm font-medium text-muted-foreground"
        >
          Nombre
        </label>
        <Input
          id="account-name"
          placeholder="Caja de ahorro, Mercado Pago…"
          aria-invalid={Boolean(errors.name)}
          {...register("name", { required: "Nombre requerido" })}
        />
        {errors.name ? (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="account-type"
          className="text-sm font-medium text-muted-foreground"
        >
          Tipo
        </label>
        <select
          id="account-type"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          {...register("type")}
        >
          {ACCOUNT_TYPES.map((code) => (
            <option key={code} value={code}>
              {ACCOUNT_TYPE_LABEL_ES[code]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="account-initial-balance"
          className="text-sm font-medium text-muted-foreground"
        >
          Saldo inicial ({workspaceCurrency})
        </label>
        <Input
          id="account-initial-balance"
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          {...register("initialBalanceUnits", { required: true })}
        />
      </div>

      <div className="flex items-end">
        <Button type="submit" disabled={isBusy}>
          {isBusy ? "Creando..." : "Crear cuenta"}
        </Button>
      </div>
    </form>
  );
}
