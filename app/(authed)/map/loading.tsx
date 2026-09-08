export default function MapLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl pt-5 pb-10 lg:pt-8">
      <div className="mb-4">
        <div className="h-7 w-20 animate-pulse rounded bg-brand-50" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-brand-50" />
      </div>
      <div className="h-[380px] animate-pulse rounded-lg border border-brand-100 bg-brand-50" />
    </div>
  );
}
