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
      toast.error("No se pudo copiar. Seleccioná el enlace a mano.");
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `Mirá quién debe en el grupo: ${shareUrl}`,
  )}`;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <FormField
          label="Cómo se llama"
          htmlFor="ghost-name"
          hint="Si no tiene la app, alcanza con el nombre."
        >
          <Input
            id="ghost-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ana"
          />
        </FormField>
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-xl sm:w-auto"
          disabled={isPending || name.trim().length === 0}
          onClick={handleGhost}
        >
          Sólo el nombre
        </Button>
      </div>

      <div className="space-y-3">
        <FormField
          label="Enlace para invitar"
          htmlFor="split-share-url"
          hint="Quien lo abre ve quién debe, tenga o no la app. Si tiene cuenta, puede sumarse."
        >
          <Input
            id="split-share-url"
            value={shareUrl}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
            className="font-mono text-xs"
          />
        </FormField>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="h-11 rounded-xl"
            onClick={handleCopyLink}
          >
            Copiar enlace
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl"
            asChild
          >
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
              Mandar por WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
