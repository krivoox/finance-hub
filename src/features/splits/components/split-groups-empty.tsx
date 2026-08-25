import { SurfaceSection } from "@/components/surface-section";
import { NewSplitGroupSheet } from "./new-split-group-sheet";

export function SplitGroupsEmpty() {
  return (
    <SurfaceSection className="flex flex-col items-start gap-4 py-8 sm:py-10">
      <div className="space-y-3">
        <h2 className="font-heading text-xl font-extrabold tracking-tight text-foreground">
          ¿El asado de este finde?
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Cargás lo que puso cada uno y mandás un enlace al WhatsApp. Los demás
          ven quién debe, sin instalar nada. También anda para el alquiler y el
          súper de la casa.
        </p>
        <p className="max-w-prose text-sm text-muted-foreground">
          La otra persona{" "}
          <strong className="font-semibold text-foreground">
            no necesita tener la app
          </strong>
          : se la puede sumar sólo con el nombre y el saldo se lleva igual.
        </p>
      </div>
      <NewSplitGroupSheet />
    </SurfaceSection>
  );
}
