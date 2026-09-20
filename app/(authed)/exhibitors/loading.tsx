export default function ExhibitorsLoading() {
  return (
    <div className="pt-5 lg:pt-8">
      <div className="mb-4">
        <div className="h-7 w-32 animate-pulse rounded bg-paper-deep" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-paper-deep" />
      </div>
      <div className="mb-4 h-11 animate-pulse rounded-lg border border-rule bg-paper-deep" />
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
