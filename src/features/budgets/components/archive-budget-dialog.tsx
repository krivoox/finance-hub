"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";

import {
  archiveBudgetAction,
  unarchiveBudgetAction,
} from "@/features/budgets/actions";
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
import { navigateAndRefresh, refreshAfterMutation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

type ArchiveBudgetDialogProps = {
  budgetId: string;
  budgetName: string;
};

export function ArchiveBudgetDialog({
  budgetId,
  budgetName,
}: ArchiveBudgetDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full gap-1.5 sm:w-auto"
        >
          <Archive className="size-4" strokeWidth={1.75} />
          Archivar
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>¿Archivar presupuesto?</DialogTitle>
          <DialogDescription>
            Vas a archivar <span className="font-medium text-foreground">{budgetName}</span>.
            Dejará de aparecer en la lista activa y en el badge de atención. El
            historial se conserva; podés desarchivarlo después.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isPending}
            onClick={() => setOpen(false)}
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
                const result = await archiveBudgetAction({ budgetId });
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Presupuesto archivado");
                setOpen(false);
                navigateAndRefresh(router, "/budgets");
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

type UnarchiveBudgetButtonProps = {
  budgetId: string;
  className?: string;
};

export function UnarchiveBudgetButton({
  budgetId,
  className,
}: UnarchiveBudgetButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("w-full gap-1.5 sm:w-auto", className)}
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await unarchiveBudgetAction({ budgetId });
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Presupuesto restaurado");
          refreshAfterMutation(router);
        });
      }}
    >
      <ArchiveRestore className="size-4" strokeWidth={1.75} />
      {isPending ? "Restaurando..." : "Desarchivar"}
    </Button>
  );
}
