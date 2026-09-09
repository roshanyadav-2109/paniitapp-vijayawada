export default function SponsorsLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl pt-5 pb-10 lg:pt-8">
      <div className="mb-4">
        <div className="h-7 w-28 animate-pulse rounded bg-paper-deep" />
        <div className="mt-2 h-4 w-60 animate-pulse rounded bg-paper-deep" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-rule bg-paper-deep" />
        ))}
      </div>
    </div>
  );
}
