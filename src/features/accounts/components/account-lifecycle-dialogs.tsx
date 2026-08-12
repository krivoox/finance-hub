"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  archiveAccountAction,
  deleteAccountAction,
} from "@/features/accounts/actions";
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

type ArchiveAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName: string;
};

export function ArchiveAccountDialog({
  open,
  onOpenChange,
  accountId,
  accountName,
}: ArchiveAccountDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>¿Archivar cuenta?</DialogTitle>
          <DialogDescription>
            Vas a archivar{" "}
            <span className="font-medium text-foreground">{accountName}</span>.
            Dejará de aparecer en formularios nuevos; el historial se conserva.
            Podés desarchivarla después.
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
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-10 w-full sm:h-8 sm:w-auto"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await archiveAccountAction({ accountId });
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Cuenta archivada");
                onOpenChange(false);
                refreshAfterMutation(router);
              });
            }}
          >
            {isPending ? "Archivando..." : "Archivar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type DeleteAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName: string;
};

export function DeleteAccountDialog({
  open,
  onOpenChange,
  accountId,
  accountName,
}: DeleteAccountDialogProps) {
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
                <span className="font-medium text-foreground">{accountName}</span>{" "}
                de forma permanente. Se borrarán los movimientos de esta cuenta,
                incluidas transferencias con otras cuentas.
              </p>
              <p>
                Esta acción no se puede deshacer. Si solo querés ocultarla, usá{" "}
                <span className="font-medium text-foreground">Archivar</span>.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-1">
          <label
            htmlFor="delete-account-confirm"
            className="text-sm font-medium text-foreground"
          >
            Escribí <span className="font-semibold">{accountName}</span> para
            confirmar
          </label>
          <Input
            id="delete-account-confirm"
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
            disabled={isPending || confirmName.trim() !== accountName.trim()}
            onClick={() => {
              startTransition(async () => {
                const result = await deleteAccountAction({
                  accountId,
                  confirmName,
                });
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Cuenta eliminada");
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
