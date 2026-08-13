"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  cancelGoalAction,
  completeGoalAction,
  deleteGoalAction,
} from "@/features/goals/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { refreshAfterMutation } from "@/lib/navigation";

type GoalNameProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  goalName: string;
};

export function CancelGoalDialog({
  open,
  onOpenChange,
  goalId,
  goalName,
}: GoalNameProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>¿Cancelar objetivo?</DialogTitle>
          <DialogDescription>
            Vas a cancelar{" "}
            <span className="font-medium text-foreground">{goalName}</span>.
            No se podrán registrar aportes. El dinero ya transferido queda en
            las cuentas.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full sm:h-8 sm:w-auto"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Volver
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-10 w-full sm:h-8 sm:w-auto"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await cancelGoalAction({ goalId });
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Objetivo cancelado");
                onOpenChange(false);
                refreshAfterMutation(router);
              });
            }}
          >
            {isPending ? "Cancelando..." : "Cancelar objetivo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CompleteGoalDialog({
  open,
  onOpenChange,
  goalId,
  goalName,
}: GoalNameProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>¿Marcar como completado?</DialogTitle>
          <DialogDescription>
            Vas a marcar{" "}
            <span className="font-medium text-foreground">{goalName}</span>{" "}
            como completado aunque el monto meta no se haya alcanzado con
            aportes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full sm:h-8 sm:w-auto"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Volver
          </Button>
          <Button
            type="button"
            className="h-10 w-full sm:h-8 sm:w-auto"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await completeGoalAction({ goalId });
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Objetivo completado");
                onOpenChange(false);
                refreshAfterMutation(router);
              });
            }}
          >
            {isPending ? "Guardando..." : "Completar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteGoalDialog({
  open,
  onOpenChange,
  goalId,
  goalName,
}: GoalNameProps) {
  const router = useRouter();
  const [confirmName, setConfirmName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (!next) setConfirmName("");
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Eliminar permanentemente</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Vas a eliminar{" "}
                <span className="font-medium text-foreground">{goalName}</span>{" "}
                de forma permanente. Los aportes ya transferidos quedan en el
                historial de movimientos.
              </p>
              <p>Esta acción no se puede deshacer.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-1">
          <label
            htmlFor="delete-goal-confirm"
            className="text-sm font-medium text-foreground"
          >
            Escribí <span className="font-semibold">{goalName}</span> para
            confirmar
          </label>
          <Input
            id="delete-goal-confirm"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            disabled={isPending}
            autoComplete="off"
            className="h-10 sm:h-8"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full sm:h-8 sm:w-auto"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-10 w-full sm:h-8 sm:w-auto"
            disabled={isPending || confirmName.trim() !== goalName.trim()}
            onClick={() => {
              startTransition(async () => {
                const result = await deleteGoalAction({
                  goalId,
                  confirmName,
                });
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Objetivo eliminado");
                handleOpenChange(false);
                refreshAfterMutation(router);
              });
            }}
          >
            {isPending ? "Eliminando..." : "Eliminar permanentemente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
