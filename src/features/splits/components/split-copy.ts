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
