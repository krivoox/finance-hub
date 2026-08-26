"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteSplitGroupAction } from "@/features/splits/actions";
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
import { navigateAndRefresh, refreshAfterMutation } from "@/lib/navigation";

type DeleteSplitGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  splitGroupId: string;
  name: string;
  redirectToDirectory?: boolean;
};

export function DeleteSplitGroupDialog({
  open,
  onOpenChange,
  splitGroupId,
  name,
  redirectToDirectory = false,
}: DeleteSplitGroupDialogProps) {
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
          <DialogTitle>¿Eliminar este grupo?</DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>
                Vas a eliminar{" "}
                <span className="font-medium text-foreground">{name}</span>. Se
                borran los saldos y el historial de este círculo. Los gastos de
                cada uno en sus cuentas se quedan.
              </p>
              <p>Esta acción no se puede deshacer.</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-1">
          <label
            htmlFor="delete-split-group-confirm"
            className="text-sm font-medium text-foreground"
          >
            Escribí <span className="font-semibold">{name}</span> para confirmar
          </label>
          <Input
            id="delete-split-group-confirm"
            value={confirmName}
            onChange={(event) => setConfirmName(event.target.value)}
            disabled={isPending}
            autoComplete="off"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={isPending || confirmName.trim() !== name.trim()}
            onClick={() => {
              startTransition(async () => {
                const result = await deleteSplitGroupAction({
                  splitGroupId,
                  confirmName,
                });
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Grupo eliminado");
                handleOpenChange(false);
                if (redirectToDirectory) {
                  navigateAndRefresh(router, "/groups");
                  return;
                }
                refreshAfterMutation(router);
              });
            }}
          >
            {isPending ? "Eliminando…" : "Eliminar grupo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
