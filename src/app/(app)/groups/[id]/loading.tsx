import { Skeleton } from "@/components/ui/skeleton";

export default function SplitGroupDetailLoading() {
  return (
    <div className="space-y-4" aria-busy aria-label="Cargando grupo">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}
