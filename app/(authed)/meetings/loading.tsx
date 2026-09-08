export default function MeetingsLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-12 pt-5 lg:max-w-4xl lg:pt-8">
      <div>
        <div className="h-7 w-32 animate-pulse rounded bg-brand-50" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-brand-50" />
      </div>
      <div className="h-28 animate-pulse rounded-lg border border-brand-100 bg-brand-50" />
      <div className="h-16 animate-pulse rounded-lg border border-brand-100 bg-brand-50" />
      <div className="h-10 animate-pulse rounded-full border border-brand-100 bg-brand-50" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-brand-100 bg-brand-50"
          />
        ))}
      </div>
    </div>
  );
}
