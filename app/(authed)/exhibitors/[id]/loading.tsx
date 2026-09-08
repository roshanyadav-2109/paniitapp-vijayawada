export default function ExhibitorDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-3 pb-12">
      <div className="pt-4">
        <div className="h-3 w-24 animate-pulse rounded bg-brand-50" />
      </div>
      <div className="h-64 animate-pulse rounded-lg border border-brand-100 bg-brand-50" />
      <div className="h-32 animate-pulse rounded-lg border border-brand-100 bg-brand-50" />
      <div className="h-48 animate-pulse rounded-lg border border-brand-100 bg-brand-50" />
    </div>
  );
}
