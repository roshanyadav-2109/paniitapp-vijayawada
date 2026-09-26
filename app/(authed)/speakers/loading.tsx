export default function SpeakersLoading() {
  return (
    // Matches the page: no heading block, straight into the grid.
    <div className="mx-auto w-full max-w-4xl pb-12 pt-5 lg:pt-8">
      <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-[4/5] w-full animate-pulse rounded-lg bg-paper-deep" />
            <div className="mt-2 h-3.5 w-3/4 animate-pulse rounded bg-paper-deep" />
            <div className="mt-1.5 h-3 w-full animate-pulse rounded bg-paper-deep" />
          </div>
        ))}
      </div>
    </div>
  );
}
