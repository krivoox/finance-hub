"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSettlementAction } from "@/features/splits/actions";

const formSchema = z.object({
  fromUserId: z.string().min(1),
  toUserId: z.string().min(1),
  amount: z.string().min(1),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

type MemberOption = { userId: string; displayName: string };

export function NewSettlementForm({
  workspaceId,
  members,
}: {
  workspaceId: string;
  members: MemberOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fromUserId: members[0]?.userId ?? "",
      toUserId: members[1]?.userId ?? members[0]?.userId ?? "",
      amount: "",
      occurredOn: today,
      note: "",
    },
  });

  function onSubmit(values: FormValues) {
    const amountCents = Math.round(Number(values.amount.replace(",", ".")) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      toast.error("Monto inválido");
      return;
    }

    startTransition(async () => {
      const result = await createSettlementAction({
        workspaceId,
        fromUserId: values.fromUserId,
        toUserId: values.toUserId,
        amountCents,
        occurredOn: values.occurredOn,
        note: values.note || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Liquidación registrada");
      form.reset({ ...values, amount: "", note: "" });
      router.refresh();
    });
  }

  if (members.length < 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Necesitás al menos dos miembros para registrar una liquidación.
      </p>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2"
    >
      <h3 className="sm:col-span-2 text-sm font-medium text-foreground">
        Registrar liquidación
      </h3>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">Quién paga</span>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-base sm:h-9 sm:text-sm"
          {...form.register("fromUserId")}
        >
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.displayName}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">Quién recibe</span>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-base sm:h-9 sm:text-sm"
          {...form.register("toUserId")}
        >
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.displayName}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">Monto</span>
        <Input placeholder="0.00" {...form.register("amount")} />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="text-muted-foreground">Fecha</span>
        <Input type="date" {...form.register("occurredOn")} />
      </label>
      <div className="sm:col-span-2">
        <Button
          type="submit"
          className="h-10 w-full sm:h-8 sm:w-auto"
          disabled={pending}
        >
          {pending ? "Guardando…" : "Guardar liquidación"}
        </Button>
      </div>
    </form>
  );
}
