"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { joinSplitGroupAction } from "@/features/splits/actions";
import { Button } from "@/components/ui/button";
import { navigateAndRefresh } from "@/lib/navigation";

export function JoinSplitGroupButton({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      className="h-11 w-full rounded-xl"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await joinSplitGroupAction({ token });
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Entraste al grupo");
          navigateAndRefresh(router, `/groups/${result.data.splitGroupId}`);
        });
      }}
    >
      {isPending ? "Entrando…" : "Entrar al grupo"}
    </Button>
  );
}
