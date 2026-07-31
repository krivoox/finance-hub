"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { navigateAndRefresh } from "@/lib/navigation";
import { acceptInvitationAction } from "@/features/workspaces/actions";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onAccept() {
    startTransition(async () => {
      const result = await acceptInvitationAction({ token });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Te uniste al workspace");
      navigateAndRefresh(router, "/dashboard");
    });
  }

  return (
    <Button type="button" onClick={onAccept} disabled={pending}>
      {pending ? "Uniéndote…" : "Unirme al workspace"}
    </Button>
  );
}
