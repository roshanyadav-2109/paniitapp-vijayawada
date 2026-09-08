import { cn } from "@/lib/utils";

/**
 * Two-column page layout:
 *   - Mobile: filters stack above content (single column).
 *   - lg+: 280px sticky left column for filters, content on the right.
 *
 * Pages that don't need filters should not use this wrapper.
 */
export function PageWithFilters({
  header,
  filters,
  children,
  className,
}: {
  header?: React.ReactNode;
  filters: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("pt-5 lg:pt-8", className)}>
      {header ? <div className="mb-5 lg:mb-8">{header}</div> : null}
      <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
        <aside className="mb-5 lg:mb-0 lg:sticky lg:top-[5.5rem] lg:self-start">
          {filters}
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export function FiltersCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 lg:p-5">
      {title ? (
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </h2>
      ) : null}
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

export function ContentPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-3xl pt-5 lg:max-w-4xl lg:pt-8", className)}>
      {children}
    </div>
  );
}
