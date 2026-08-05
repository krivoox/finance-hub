"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, StopCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { navigateAndRefresh, refreshAfterMutation } from "@/lib/navigation";
import {
  endRecurringRuleAction,
  pauseRecurringRuleAction,
  resumeRecurringRuleAction,
} from "@/features/recurring/actions";
import type { RecurringRuleStatus } from "@/features/recurring/domain";

type LifecycleActionsProps = {
  ruleId: string;
  status: RecurringRuleStatus;
  canMutate: boolean;
  redirectOnEnd?: string;
};

export function LifecycleActions({
  ruleId,
  status,
  canMutate,
  redirectOnEnd,
}: LifecycleActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!canMutate || status === "ended") return null;

  const runPause = () => {
    startTransition(async () => {
      const result = await pauseRecurringRuleAction({ ruleId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Recurrente pausada");
      refreshAfterMutation(router);
    });
  };

  const runResume = () => {
    startTransition(async () => {
      const result = await resumeRecurringRuleAction({ ruleId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Recurrente reanudada");
      refreshAfterMutation(router);
    });
  };

  const runEnd = () => {
    const ok = window.confirm(
      "¿Finalizar la recurrente? Deja de generar nuevas ocurrencias. No borra transacciones ya registradas.",
    );
    if (!ok) return;
    startTransition(async () => {
      const result = await endRecurringRuleAction({ ruleId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Recurrente finalizada");
      if (redirectOnEnd) {
        navigateAndRefresh(router, redirectOnEnd);
      } else {
        refreshAfterMutation(router);
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "active" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          disabled={isPending}
          onClick={runPause}
        >
          <Pause className="size-4" strokeWidth={1.75} aria-hidden />
          Pausar
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          disabled={isPending}
          onClick={runResume}
        >
          <Play className="size-4" strokeWidth={1.75} aria-hidden />
          Reanudar
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
        disabled={isPending}
        onClick={runEnd}
      >
        <StopCircle className="size-4" strokeWidth={1.75} aria-hidden />
        Finalizar
      </Button>
    </div>
  );
}
