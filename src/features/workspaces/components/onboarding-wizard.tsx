"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { createAccountAction } from "@/features/accounts/actions";
import { createAccountSchema } from "@/features/accounts/schemas";
import type { AccountType } from "@/features/accounts/domain";
import {
  ACCOUNT_TYPE_LABEL_ES,
} from "@/features/accounts/components/account-type-labels";
import {
  completeWorkspaceSetupAction,
  dismissWorkspaceSetupAction,
} from "@/features/workspaces/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { LedgerPreview, type LedgerPreviewAccount } from "./ledger-preview";

type Step = "intro" | "createAccount";

type OnboardingWizardProps = {
  workspaceId: string;
  initialName: string;
  initialCurrency: string;
  canManage: boolean;
  initialAccounts?: LedgerPreviewAccount[];
};

type AccountValues = {
  name: string;
  type: AccountType;
  initialBalanceUnits: string;
};

const QUICK_ACCOUNT_TYPES: AccountType[] = [
  "cash",
  "checking",
  "credit_card",
  "virtual_wallet",
];

function progressFraction(step: Step): number {
  // 2-step wizard: intro shows 50%, createAccount shows 100%
  return step === "intro" ? 0.5 : 1;
}

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function IntroIllustration({
  variant = "inline",
}: {
  variant?: "inline" | "panel";
}) {
  const panel = variant === "panel";

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        panel
          ? "flex h-full flex-col bg-muted/30 p-5 sm:p-6"
          : "rounded-2xl border border-border bg-muted/30 px-4 py-5 sm:px-6",
      )}
      aria-hidden="true"
    >
      <div className="absolute -left-10 top-0 h-28 w-28 rounded-full bg-info-muted/60 blur-3xl" />
      <div className="absolute -right-10 bottom-0 h-28 w-28 rounded-full bg-muted/80 blur-3xl" />

      <div className={cn("relative space-y-4", panel && "flex flex-1 flex-col")}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Primer vistazo
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {todayIsoDate()}
          </p>
        </div>

        <svg
          className={cn("w-full", panel ? "h-44 flex-1" : "h-36")}
          viewBox="0 0 520 180"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M40 40H480"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-border"
          />
          <path
            d="M40 90H480"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-border"
          />
          <path
            d="M40 140H480"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-border"
          />

          <rect
            x="50"
            y="50"
            width="120"
            height="26"
            rx="8"
            className="fill-muted"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="455" cy="63" r="10" className="fill-info-muted" />

          <path
            d="M70 113C120 88 160 165 210 118C260 71 310 142 360 98C400 62 435 88 470 72"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className="text-info-muted-foreground"
          />

          <circle cx="210" cy="118" r="8" className="fill-info-muted" />
          <circle cx="360" cy="98" r="8" className="fill-info-muted" />

          <path
            d="M70 155H210"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className="text-border"
          />
          <path
            d="M70 165H160"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className="text-muted-foreground/70"
          />
        </svg>

        <div className={cn("space-y-1", panel && "mt-auto")}>
          <p className="text-sm font-medium text-foreground">
            Tu espacio ya está por empezar
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Creás una cuenta y el panel muestra tu patrimonio con el botón{" "}
            <span className="font-medium text-foreground">Registrar</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

export function OnboardingWizard({
  workspaceId,
  initialName,
  initialCurrency,
  canManage,
  initialAccounts = [],
}: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [isPending, startTransition] = useTransition();

  // If the server already indicates the workspace has accounts, we should
  // never be here. Still, guard client-side to avoid confusing UI.
  useEffect(() => {
    if (initialAccounts.length > 0) {
      router.replace("/dashboard");
    }
  }, [initialAccounts.length, router]);

  const [accounts] = useState<LedgerPreviewAccount[]>(initialAccounts);

  const accountForm = useForm<AccountValues>({
    defaultValues: {
      name: "",
      type: "checking",
      initialBalanceUnits: "0",
    },
  });

  const progressLabel = useMemo(() => {
    const n = step === "intro" ? 1 : 2;
    return `Paso ${n} de 2`;
  }, [step]);

  if (!canManage) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
        <p className="mb-6 text-sm font-semibold tracking-tight text-foreground">
          Finance Hub
        </p>
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-md sm:p-8">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Configuración del espacio
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Solo el owner o un admin pueden completar el setup inicial.
          </p>
        </div>
      </div>
    );
  }

  const dismissSetup = () => {
    startTransition(async () => {
      const result = await dismissWorkspaceSetupAction({ workspaceId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push("/accounts");
      router.refresh();
    });
  };

  const goToCreateAccount = () => setStep("createAccount");

  const submitFirstAccount = accountForm.handleSubmit((values) => {
    const parsedUnits = Number(values.initialBalanceUnits.replace(",", "."));
    if (!Number.isFinite(parsedUnits) || parsedUnits < 0) {
      toast.error("Saldo inicial inválido");
      return;
    }
    const initialBalanceCents = Math.round(parsedUnits * 100);

    const input = {
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

      // Complete sets active workspace + clears dismiss cookie.
      const complete = await completeWorkspaceSetupAction({ workspaceId });
      if (!complete.ok) {
        toast.error(complete.error);
        return;
      }

      toast.success("Cuenta creada");
      router.push("/dashboard");
      router.refresh();
    });
  });

  const selectedType = useWatch({ control: accountForm.control, name: "type" });

  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-8 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:justify-center sm:py-12">
      <p className="mb-5 text-sm font-semibold tracking-tight text-foreground sm:mb-6">
        Finance Hub
      </p>

      <div
        className={cn(
          "relative w-full max-w-3xl overflow-hidden rounded-2xl border border-border bg-card shadow-md",
          "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        {/* Hairline progress along the top edge */}
        <div className="absolute inset-x-0 top-0 z-10 h-0.5 bg-border" aria-hidden />
        <div
          className="absolute inset-x-0 top-0 z-10 h-0.5 origin-left bg-info motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out"
          style={{ transform: `scaleX(${progressFraction(step)})` }}
          role="progressbar"
          aria-valuenow={Math.round(progressFraction(step) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={progressLabel}
        />

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]">
          <div className="flex min-h-0 flex-col p-5 sm:p-7 lg:min-h-[22rem] lg:p-8">
            <p className="text-xs font-medium text-muted-foreground">{progressLabel}</p>

            {step === "intro" ? (
              <div className="mt-4 flex flex-1 flex-col space-y-6">
                <div>
                  <h1
                    id="onboarding-title"
                    className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl"
                  >
                    Tu espacio está casi listo
                  </h1>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    En 1 minuto lo dejás usable. Primero miramos el espacio,
                    después creás tu primera cuenta.
                  </p>
                </div>

                {/* Mobile / tablet: illustration stacked under copy */}
                <div className="lg:hidden">
                  <IntroIllustration />
                </div>

                <div className="mt-auto space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground">
                    Espacio:{" "}
                    <span className="font-medium text-foreground">
                      {initialName}
                    </span>{" "}
                    ·{" "}
                    <span className="font-medium tabular-nums text-foreground">
                      {initialCurrency}
                    </span>
                  </p>
                  <Button
                    type="button"
                    className="h-11 w-full sm:w-auto"
                    disabled={isPending}
                    onClick={goToCreateAccount}
                  >
                    Continuar
                  </Button>
                  <div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={dismissSetup}
                      className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                    >
                      Omitir por ahora
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {step === "createAccount" ? (
              <div className="mt-4 flex-1 space-y-6">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    Creá tu primera cuenta
                  </h1>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    Con una cuenta ya podés registrar movimientos. Podés editar todo después.
                  </p>
                </div>

                <form className="space-y-4" onSubmit={submitFirstAccount} noValidate>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_ACCOUNT_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={cn(
                          "h-10 rounded-full border px-3.5 text-sm transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                          selectedType === type
                            ? "border-info bg-info-muted text-foreground"
                            : "border-border bg-background text-muted-foreground hover:bg-muted",
                        )}
                        onClick={() => accountForm.setValue("type", type)}
                      >
                        {ACCOUNT_TYPE_LABEL_ES[type]}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="account-name" className="text-sm font-medium text-muted-foreground">
                      Nombre
                    </label>
                    <Input
                      id="account-name"
                      className="h-11"
                      placeholder="Efectivo, Banco Nación…"
                      {...accountForm.register("name")}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="account-balance"
                      className="text-sm font-medium text-muted-foreground"
                    >
                      Saldo inicial ({initialCurrency})
                    </label>
                    <Input
                      id="account-balance"
                      className="h-11 tabular-nums"
                      inputMode="decimal"
                      defaultValue="0"
                      {...accountForm.register("initialBalanceUnits")}
                    />
                  </div>

                  <Button type="submit" className="h-11 w-full sm:w-auto" disabled={isPending}>
                    Crear cuenta y empezar
                  </Button>
                </form>
              </div>
            ) : null}
          </div>

          {step === "intro" ? (
            <div className="hidden min-h-[20rem] border-t border-border lg:block lg:border-l lg:border-t-0">
              <IntroIllustration variant="panel" />
            </div>
          ) : null}

          {step === "createAccount" ? (
            <div className="hidden border-t border-border bg-muted/30 lg:block lg:border-l lg:border-t-0">
              <LedgerPreview
                currency={initialCurrency}
                workspaceName={initialName}
                accounts={accounts}
                expense={null}
                variant="embedded"
                className="h-full min-h-[12rem]"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

