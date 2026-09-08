import type { LucideIcon } from "lucide-react";

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
      <Icon className="h-10 w-10 text-slate-300" strokeWidth={1.5} />
      <h3 className="mt-4 text-base font-semibold tracking-tight text-brand-900">
        {title}
      </h3>
      <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
