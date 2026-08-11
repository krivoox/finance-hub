"use client";

import { useEffect, useEffectEvent, startTransition } from "react";
import { Coffee } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  dismissCafecito,
  isCafecitoDismissed,
} from "@/lib/cafecito-storage";

import { useCafecitoDialogStore } from "../stores/cafecito-dialog-store";

/** Delay before auto-prompt so first paint / nav stay calm. */
const AUTO_OPEN_DELAY_MS = 4_000;

type CafecitoDonationDialogProps = {
  /** Profile URL (e.g. https://cafecito.app/tu-usuario). Null hides the feature. */
  donationUrl: string | null;
};

export function CafecitoDonationDialog({
  donationUrl,
}: CafecitoDonationDialogProps) {
  const open = useCafecitoDialogStore((s) => s.open);
  const forced = useCafecitoDialogStore((s) => s.forced);
  const openDialog = useCafecitoDialogStore((s) => s.openDialog);
  const closeDialog = useCafecitoDialogStore((s) => s.closeDialog);
  const setOpen = useCafecitoDialogStore((s) => s.setOpen);

  const tryAutoOpen = useEffectEvent(() => {
    if (!donationUrl) return;
    if (isCafecitoDismissed()) return;
    openDialog({ forced: false });
  });

  useEffect(() => {
    if (!donationUrl) return;

    const timer = window.setTimeout(() => {
      startTransition(() => {
        tryAutoOpen();
      });
    }, AUTO_OPEN_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [donationUrl]);

  if (!donationUrl) return null;

  const url = donationUrl;

  function handleOpenChange(next: boolean) {
    if (!next) {
      if (!forced) {
        dismissCafecito();
      }
      closeDialog();
      return;
    }
    setOpen(true);
  }

  function handleDismiss() {
    dismissCafecito();
    closeDialog();
  }

  function handleDonate() {
    dismissCafecito();
    closeDialog();
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex size-11 items-center justify-center rounded-xl bg-info-muted text-info-muted-foreground">
            <Coffee className="size-5" strokeWidth={1.75} aria-hidden />
          </div>
          <DialogTitle>¿Nos invitás un cafecito?</DialogTitle>
          <DialogDescription>
            Finance Hub es un proyecto independiente. Si te está sirviendo para
            ordenar tus finanzas, podés apoyar el desarrollo con un cafecito en
            cafecito.app.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full sm:h-9 sm:w-auto"
            onClick={handleDismiss}
          >
            Ahora no
          </Button>
          <Button
            type="button"
            className="h-10 w-full gap-1.5 sm:h-9 sm:w-auto"
            onClick={handleDonate}
          >
            <Coffee className="size-4" strokeWidth={1.75} aria-hidden />
            Invitar un cafecito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
