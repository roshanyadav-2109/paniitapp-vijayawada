export default function NetworkingLoading() {
  return (
    <div className="pt-5 lg:pt-8">
      <div className="mb-4">
        <div className="h-7 w-40 animate-pulse rounded bg-paper-deep" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-paper-deep" />
      </div>
      <div className="mb-4 h-9 w-44 animate-pulse rounded-full border border-rule bg-paper-deep" />
      <div className="mb-3 flex gap-2">
        <div className="h-11 flex-1 animate-pulse rounded-lg border border-rule bg-paper-deep" />
        <div className="size-11 animate-pulse rounded-lg border border-rule bg-paper-deep" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg border border-rule bg-paper-deep"
          />
        ))}
      </div>
    </div>
  );
}
