"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChipMultiSelect({
  name,
  label,
  helper,
  options,
  initial,
}: {
  name: string;
  label: string;
  helper?: string;
  options: readonly string[];
  initial: string[];
}) {
  // Filter the initial set to only allowed options so old free-text entries
  // don't sneak in. Whatever the user has selected is round-tripped through a
  // single hidden comma-separated input that the existing server action parses.
  const allowed = new Set(options);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initial.filter((v) => allowed.has(v)))
  );

  function toggle(opt: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(opt)) next.delete(opt);
      else next.add(opt);
      return next;
    });
  }

  const value = Array.from(selected).join(",");

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-brand-900">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.has(opt);
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(opt)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                active
                  ? "border-brand-800 bg-brand-800 text-white"
                  : "border-brand-100 bg-white text-brand-900 hover:bg-brand-50/40"
              )}
            >
              {active ? <Check className="size-3" strokeWidth={2} /> : null}
              {opt}
            </button>
          );
        })}
      </div>
      {helper ? (
        <p className="mt-1.5 text-[11px] text-brand-800/70">{helper}</p>
      ) : null}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
