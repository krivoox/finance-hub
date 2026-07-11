"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <Button type="button" onClick={onAccept} disabled={pending}>
      {pending ? "Uniéndote…" : "Unirme al workspace"}
    </Button>
  );
}
