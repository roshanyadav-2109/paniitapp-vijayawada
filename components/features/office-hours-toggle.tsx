"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { setOfficeHours } from "@/app/actions/office-hours";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function OfficeHoursToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function toggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      const res = await setOfficeHours(next);
      if ("error" in res) {
        setOn(!next);
        toast({ title: "Could not update", description: res.error, variant: "destructive" });
      } else {
        toast({ title: next ? "Office hours on" : "Office hours off" });
      }
    });
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3">
      <div>
        <div className="text-sm font-medium text-brand-900">Open for meetings</div>
        <div className="text-xs text-slate-500">
          Show up in the office-hours directory so founders can book a 15-min slot.
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        disabled={pending}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
          on ? "bg-brand-800" : "bg-slate-300"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform",
            on ? "translate-x-5" : "translate-x-0"
          )}
        />
        {pending ? (
          <Loader2 className="absolute inset-0 m-auto h-3 w-3 animate-spin text-white" />
        ) : null}
      </button>
    </div>
  );
}
