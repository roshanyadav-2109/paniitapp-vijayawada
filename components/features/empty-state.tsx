import type { LucideIcon } from "@/components/icons";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-16 text-center">
      <Icon className="h-10 w-10 text-rule-strong" strokeWidth={1.5} />
      <h3 className="mt-4 font-display text-base font-semibold text-brand-900">
        {title}
      </h3>
      <p className="mt-1.5 text-sm leading-6 text-brand-900/60">{description}</p>
    </div>
  );
}
