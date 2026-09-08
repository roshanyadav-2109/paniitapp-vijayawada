"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LogIn, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  sessionId: string;
  startsAtIso: string;
  endsAtIso: string;
  initialCheckedIn: boolean;
}

const TEN_MIN = 10 * 60 * 1000;
const THIRTY_MIN = 30 * 60 * 1000;

export function CheckInButton({ sessionId, startsAtIso, endsAtIso, initialCheckedIn }: Props) {
  const router = useRouter();
  const [now, setNow] = useState<number>(() => Date.now());
  const [checkedIn, setCheckedIn] = useState(initialCheckedIn);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const startMs = new Date(startsAtIso).getTime();
  const endMs = new Date(endsAtIso).getTime();
  const open = now >= startMs - TEN_MIN && now <= endMs + THIRTY_MIN;

  if (!open && !checkedIn) return null;

  function handle() {
    if (checkedIn) return;
    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase
        .from("session_checkins")
        .upsert({ user_id: user.id, session_id: sessionId });
      if (!error) {
        setCheckedIn(true);
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending || checkedIn}
      aria-pressed={checkedIn}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-md px-5 text-sm font-medium transition-colors",
        checkedIn
          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
          : "bg-brand-800 text-white hover:bg-brand-900 disabled:opacity-60"
      )}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : checkedIn ? (
        <Check className="h-4 w-4" />
      ) : (
        <LogIn className="h-4 w-4" />
      )}
      {checkedIn ? "Checked in" : "Check in"}
    </button>
  );
}
