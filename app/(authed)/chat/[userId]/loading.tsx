export default function ThreadLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl pt-5 pb-10 lg:pt-8">
      <div className="mb-4">
        <div className="h-7 w-36 animate-pulse rounded bg-brand-50" />
        <div className="mt-2 h-4 w-44 animate-pulse rounded bg-brand-50" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg border border-brand-100 bg-brand-50" />
        ))}
      </div>
    </div>
  );
}
