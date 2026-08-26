import { Scale } from "lucide-react";

import { SurfaceSection } from "@/components/surface-section";
import { NewSplitGroupSheet } from "./new-split-group-sheet";

export function SplitGroupsEmpty() {
  return (
    <SurfaceSection>
      <div className="flex flex-col items-start gap-3 py-2">
        <span
          className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"
          aria-hidden
        >
          <Scale className="size-5" strokeWidth={1.75} />
        </span>
        <div className="max-w-prose space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Sobre tus cuentas
          </p>
          <p className="text-sm font-medium text-foreground">
            Repartí un gasto entre varios
          </p>
          <p className="text-sm text-muted-foreground text-pretty">
            El grupo no es otra cuenta: el movimiento se carga como siempre, en
            tu ledger, y se imputa a las personas. Quien no tiene la app entra
            sólo con el nombre; el enlace muestra los saldos.
          </p>
        </div>
        <NewSplitGroupSheet />
      </div>
    </SurfaceSection>
  );
}
