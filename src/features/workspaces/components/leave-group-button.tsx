"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
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
import { leaveGroupWorkspaceAction } from "@/features/workspaces/actions";
import { navigateAndRefresh } from "@/lib/navigation";

type LeaveGroupButtonProps = {
  workspaceId: string;
  workspaceName: string;
  /** False when caller is last owner — UI still explains why. */
  canLeave: boolean;
  blockedReason?: string;
};

export function LeaveGroupButton({
  workspaceId,
  workspaceName,
  canLeave,
  blockedReason,
}: LeaveGroupButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!canLeave) {
    return (
      <div className="space-y-2 rounded-lg border border-border p-4">
        <p className="text-sm font-medium text-foreground">Salir del grupo</p>
        <p className="text-xs text-muted-foreground">
          {blockedReason ??
            "No podés salir siendo el único owner. Transferí la propiedad primero."}
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full sm:h-8 sm:w-auto"
          disabled
        >
          <LogOut className="size-4" strokeWidth={1.75} />
          Salir del grupo
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="space-y-2 rounded-lg border border-border p-4">
        <p className="text-sm font-medium text-foreground">Salir del grupo</p>
        <p className="text-xs text-muted-foreground">
          Dejarás de ver cuentas y movimientos de &ldquo;{workspaceName}&rdquo;.
        </p>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-8 sm:w-auto"
          >
            <LogOut className="size-4" strokeWidth={1.75} />
            Salir del grupo
          </Button>
        </DialogTrigger>
      </div>
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>¿Salir de {workspaceName}?</DialogTitle>
          <DialogDescription>
            Vas a dejar de ser miembro. Si era tu workspace activo, pasás al
            personal.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full sm:h-8 sm:w-auto"
            disabled={pending}
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-10 w-full sm:h-8 sm:w-auto"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await leaveGroupWorkspaceAction({ workspaceId });
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Saliste del grupo");
                setOpen(false);
                navigateAndRefresh(router, "/groups");
              });
            }}
          >
            {pending ? "Saliendo…" : "Salir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
