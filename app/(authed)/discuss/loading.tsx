export default function DiscussLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl pt-5 pb-10 lg:pt-8">
      <div className="mb-4">
        <div className="h-7 w-32 animate-pulse rounded bg-paper-deep" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-paper-deep" />
      </div>
      <div className="mb-3 h-28 animate-pulse rounded-lg border border-rule bg-paper-deep" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg border border-rule bg-paper-deep" />
        ))}
      </div>
    </div>
  );
}
