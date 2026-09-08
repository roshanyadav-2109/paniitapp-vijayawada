export default function MeLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-2.5 pb-12 pt-5 lg:pt-8">
      <div className="h-72 animate-pulse rounded-lg border border-brand-100 bg-brand-50" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-lg border border-brand-100 bg-brand-50"
        />
      ))}
    </div>
  );
}
