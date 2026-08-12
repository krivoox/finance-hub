"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deleteGroupWorkspaceAction } from "@/features/workspaces/actions";
import { navigateAndRefresh } from "@/lib/navigation";

type DeleteGroupDialogProps = {
  workspaceId: string;
  workspaceName: string;
  /** Only owners see the destructive CTA. */
  canDelete: boolean;
};

export function DeleteGroupDialog({
  workspaceId,
  workspaceName,
  canDelete,
}: DeleteGroupDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [pending, startTransition] = useTransition();
  const [crossLinksHint, setCrossLinksHint] = useState(false);

  const nameMatches = confirmName === workspaceName;

  if (!canDelete) {
    return null;
  }

  function resetAndClose(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setConfirmName("");
      setCrossLinksHint(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <div className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm font-medium text-foreground">Eliminar grupo</p>
        <p className="text-xs text-muted-foreground">
          Borra de forma permanente cuentas, movimientos, presupuestos y
          membresías de este grupo. No se puede deshacer.
        </p>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="destructive"
            className="h-10 w-full gap-1.5 sm:h-8 sm:w-auto"
          >
            <Trash2 className="size-4" strokeWidth={1.75} />
            Eliminar grupo
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>Eliminar &ldquo;{workspaceName}&rdquo;</DialogTitle>
          <DialogDescription>
            Escribí el nombre exacto del grupo para confirmar. Esta acción es
            irreversible.
          </DialogDescription>
        </DialogHeader>

        {crossLinksHint ? (
          <div
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            role="alert"
          >
            Hay vínculos con otros workspaces. Resolvelos (aportes / cuentas
            cruzadas) antes de eliminar.{" "}
            <Link
              href="/transactions"
              className="font-medium underline underline-offset-2"
            >
              Ir a movimientos
            </Link>
          </div>
        ) : null}

        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">
            Nombre del grupo: <span className="text-foreground">{workspaceName}</span>
          </span>
          <Input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={workspaceName}
            autoComplete="off"
            disabled={pending}
          />
        </label>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full sm:h-8 sm:w-auto"
            disabled={pending}
            onClick={() => resetAndClose(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-10 w-full sm:h-8 sm:w-auto"
            disabled={pending || !nameMatches}
            onClick={() => {
              startTransition(async () => {
                const result = await deleteGroupWorkspaceAction({
                  workspaceId,
                  confirmName,
                });
                if (!result.ok) {
                  if (result.code === "WorkspaceHasCrossLinks") {
                    setCrossLinksHint(true);
                  }
                  toast.error(result.error);
                  return;
                }
                toast.success("Grupo eliminado");
                resetAndClose(false);
                navigateAndRefresh(router, "/groups");
              });
            }}
          >
            {pending ? "Eliminando…" : "Eliminar definitivamente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
