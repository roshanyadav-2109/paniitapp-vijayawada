import { Skeleton } from "@/components/ui/skeleton";

export default function AgendaDetailLoading() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-2.5 pb-10 pt-4 sm:px-4 lg:max-w-4xl lg:px-0 lg:pt-7">
      <Skeleton className="h-44 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
    </div>
  );
}
