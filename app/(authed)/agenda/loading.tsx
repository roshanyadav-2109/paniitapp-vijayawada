export default function AgendaLoading() {
  return (
    <div className="pt-5 lg:pt-8">
      <div className="mb-4">
        <div className="h-7 w-32 animate-pulse rounded bg-brand-50" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-brand-50" />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="h-10 animate-pulse rounded-md border border-brand-100 bg-brand-50" />
        <div className="h-10 animate-pulse rounded-md border border-brand-100 bg-brand-50" />
      </div>
      <div className="mb-4 flex gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-20 shrink-0 animate-pulse rounded-md border border-brand-100 bg-brand-50"
          />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-lg border border-brand-100 bg-brand-50"
          />
        ))}
      </div>
    </div>
  );
}
