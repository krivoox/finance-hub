export type SplitGroupKindUi = "ongoing" | "one_time";

export const SPLIT_GROUP_KIND_OPTIONS = [
  { value: "ongoing", label: "En curso" },
  { value: "one_time", label: "De una vez" },
] as const;

export function splitGroupKindLabel(kind: SplitGroupKindUi): string {
  return kind === "ongoing" ? "En curso" : "De una vez";
}

export function splitGroupKindHint(kind: SplitGroupKindUi): string {
  return kind === "ongoing"
    ? "Algo que sigue: casa, viaje largo"
    : "Algo de una vez: asado, salida";
}

export function peopleCountLabel(count: number): string {
  return count === 1 ? "1 persona" : `${count} personas`;
}

export function groupCountLabel(count: number): string {
  return count === 1 ? "1 grupo" : `${count} grupos`;
}

export function memberKindCaption(
  kind: "user" | "ghost",
  isActor = false,
): string {
  if (isActor) return "Vos";
  return kind === "ghost" ? "Sin cuenta" : "Con cuenta";
}

export function actorNetHint(netCents: number): string {
  if (netCents > 0) return "A tu favor";
  if (netCents < 0) return "A tu cargo";
  return "Sin diferencia";
}
