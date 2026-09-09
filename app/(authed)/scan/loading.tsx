export default function ScanLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl pt-5 pb-10 lg:pt-8">
      <div className="mb-4">
        <div className="h-7 w-24 animate-pulse rounded bg-paper-deep" />
        <div className="mt-2 h-4 w-56 animate-pulse rounded bg-paper-deep" />
      </div>
      <div className="h-[320px] animate-pulse rounded-lg border border-rule bg-paper-deep" />
    </div>
  );
}
