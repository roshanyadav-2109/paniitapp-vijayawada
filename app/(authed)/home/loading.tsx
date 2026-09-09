export default function HomeLoading() {
  return (
    <div className="-mx-4 space-y-5 pt-4 sm:-mx-6 lg:-mx-8 lg:pt-6">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="h-32 animate-pulse rounded-lg border border-rule bg-paper-deep" />
      </div>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="h-36 animate-pulse rounded-lg border border-rule bg-paper-deep" />
      </div>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg border border-rule bg-paper-deep"
            />
          ))}
        </div>
      </div>
      <div className="space-y-2 px-4 sm:px-6 lg:px-8">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg border border-rule bg-paper-deep"
          />
        ))}
      </div>
    </div>
  );
}
