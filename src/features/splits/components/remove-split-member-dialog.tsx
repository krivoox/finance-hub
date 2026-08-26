"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { removeSplitGroupMemberAction } from "@/features/splits/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { navigateAndRefresh, refreshAfterMutation } from "@/lib/navigation";

type RemoveSplitMemberDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  splitGroupId: string;
  memberId: string;
  displayName: string;
  isSelf: boolean;
};

export function RemoveSplitMemberDialog({
  open,
  onOpenChange,
  splitGroupId,
  memberId,
  displayName,
  isSelf,
}: RemoveSplitMemberDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>
            {isSelf ? "¿Salir de este grupo?" : "¿Sacar a esta persona?"}
          </DialogTitle>
          <DialogDescription>
            {isSelf
              ? "Vas a dejar de ver este grupo. Solo se puede si todavía no tenés gastos ni cobros."
              : `Vas a sacar a ${displayName} del grupo. Solo se puede si todavía no tiene gastos ni cobros.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await removeSplitGroupMemberAction({
                  splitGroupId,
                  memberId,
                });
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success(isSelf ? "Saliste del grupo" : "Persona sacada");
                onOpenChange(false);
                if (isSelf) {
                  navigateAndRefresh(router, "/groups");
                  return;
                }
                refreshAfterMutation(router);
              });
            }}
          >
            {isPending ? "Sacando…" : isSelf ? "Salir" : "Sacar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
