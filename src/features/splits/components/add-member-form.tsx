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
  groupName,
}: {
  splitGroupId: string;
  shareUrl: string;
  groupName: string;
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
      toast.success("Persona anotada");
      setName("");
      refreshAfterMutation(router);
    });
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Enlace copiado");
    } catch {
      toast.error("No se pudo copiar. Seleccioná el enlace a mano.");
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `Saldos de «${groupName}» en Finance Hub: ${shareUrl}`,
  )}`;

  return (
    <div className="space-y-6">
      <FormField
        label="Sólo el nombre"
        htmlFor="ghost-name"
        hint="Entra en el reparto aunque no use la app."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="ghost-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre"
            className="sm:flex-1"
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0 rounded-xl sm:w-auto"
            disabled={isPending || name.trim().length === 0}
            onClick={handleGhost}
          >
            Anotar
          </Button>
        </div>
      </FormField>

      <FormField
        label="Enlace de saldos"
        htmlFor="split-share-url"
        hint="Quien lo abre ve los saldos. Con cuenta, puede entrar al grupo."
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
          variant="outline"
          className="h-10 rounded-xl"
          onClick={handleCopyLink}
        >
          Copiar enlace
        </Button>
        <Button type="button" variant="outline" className="h-10 rounded-xl" asChild>
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            Enviar por WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
}
