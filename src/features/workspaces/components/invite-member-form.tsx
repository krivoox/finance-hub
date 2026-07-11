"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { inviteMemberAction } from "@/features/workspaces/actions";

const formSchema = z.object({
  email: z.string().email("Email inválido"),
  role: z.enum(["admin", "member", "viewer"]),
});

type FormValues = z.infer<typeof formSchema>;

export function InviteMemberForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", role: "member" },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      const result = await inviteMemberAction({
        workspaceId,
        email: values.email,
        role: values.role,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setInviteUrl(result.data.inviteUrl);
      toast.success("Invitación creada");
      form.reset({ email: "", role: "member" });
      router.refresh();
    });
  }

  async function copyLink() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Link copiado");
    } catch {
      toast.error("No se pudo copiar. Copiá el link manualmente.");
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2"
      >
        <h3 className="sm:col-span-2 text-sm font-medium text-foreground">
          Invitar miembro
        </h3>
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span className="text-muted-foreground">Email</span>
          <Input
            type="email"
            placeholder="persona@email.com"
            {...form.register("email")}
          />
          {form.formState.errors.email ? (
            <span className="text-xs text-destructive">
              {form.formState.errors.email.message}
            </span>
          ) : null}
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-muted-foreground">Rol</span>
          <select
            className="h-9 rounded-md border border-input bg-background px-3"
            {...form.register("role")}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
        </label>
        <div className="flex items-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Invitando…" : "Crear invitación"}
          </Button>
        </div>
      </form>

      {inviteUrl ? (
        <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">
            Compartí este link (válido 7 días)
          </p>
          <p className="break-all text-xs text-muted-foreground font-mono">
            {inviteUrl}
          </p>
          <Button type="button" variant="secondary" size="sm" onClick={copyLink}>
            Copiar link
          </Button>
        </div>
      ) : null}
    </div>
  );
}
