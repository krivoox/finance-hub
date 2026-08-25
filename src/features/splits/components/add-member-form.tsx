"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { addGhostMemberAction } from "@/features/splits/actions";
import { FormField } from "@/components/form-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { refreshAfterMutation } from "@/lib/navigation";

export function AddMemberForm({
  splitGroupId,
  shareUrl,
}: {
  splitGroupId: string;
  shareUrl: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleGhost = () => {
    startTransition(async () => {
      const result = await addGhostMemberAction({
        splitGroupId,
        displayName: name,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Persona sumada");
      setName("");
      refreshAfterMutation(router);
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Enlace copiado. Mandalo por WhatsApp.");
    } catch {
      toast.error("No se pudo copiar el enlace");
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `Mirá quién debe en el grupo: ${shareUrl}`,
  )}`;

  return (
    <div className="space-y-4">
      <FormField label="Cómo se llama" htmlFor="ghost-name">
        <Input
          id="ghost-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ana"
        />
      </FormField>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="h-11 rounded-xl"
          onClick={handleCopyLink}
        >
          Tiene la app: mandarle un enlace
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-xl"
          disabled={isPending || name.trim().length === 0}
          onClick={handleGhost}
        >
          Sólo el nombre
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        El enlace también se puede abrir sin la app.{" "}
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          Mandar por WhatsApp
        </a>
      </p>
    </div>
  );
}
