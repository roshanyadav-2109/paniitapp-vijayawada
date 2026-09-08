"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  buildAvailabilitySlots,
  classifySlot,
  slotLabel,
  suggestThreeSlots,
  type Slot,
  type SlotConflict,
} from "@/lib/slots";
import { cn } from "@/lib/utils";

interface ConflictWindow {
  start: string;
  end: string;
}

interface Props {
  inviteeId: string;
  selected: Slot[];
  onChange: (next: Slot[]) => void;
  max?: number;
  onInviteeAvailabilityKnown?: (hasSet: boolean) => void;
}

type InviteeSlotStatus = "available" | "booked" | "blocked";

export function SlotPicker({
  inviteeId,
  selected,
  onChange,
  max = 3,
  onInviteeAvailabilityKnown,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const slots = useMemo(() => buildAvailabilitySlots(), []);
  const [bookmarked, setBookmarked] = useState<ConflictWindow[]>([]);
  const [accepted, setAccepted] = useState<ConflictWindow[]>([]);
  const [featured, setFeatured] = useState<ConflictWindow[]>([]);
  const [inviteeSlots, setInviteeSlots] = useState<Map<string, InviteeSlotStatus> | null>(null);
  const [inviteeHasSetAvailability, setInviteeHasSetAvailability] = useState<boolean | null>(null);
  const [inviteeOccupiedStarts, setInviteeOccupiedStarts] = useState<Set<string>>(new Set());
  const [inviteeAccepted, setInviteeAccepted] = useState<ConflictWindow[]>([]);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [bm, mt, feat] = await Promise.all([
        supabase
          .from("session_bookmarks")
          .select("sessions(start_at, end_at)")
          .eq("user_id", user.id),
        supabase
          .from("meetings")
          .select("accepted_slot, status, requester_id, invitee_id")
          .or(`requester_id.eq.${user.id},invitee_id.eq.${user.id}`)
          .eq("status", "accepted"),
        supabase
          .from("sessions")
          .select("start_at, end_at")
          .eq("is_featured", true),
      ]);

      const bms = (bm.data as { sessions: { start_at: string; end_at: string } | null }[] | null) ?? [];
      setBookmarked(
        bms
          .map((r) => r.sessions)
          .filter((s): s is { start_at: string; end_at: string } => !!s)
          .map((s) => ({ start: s.start_at, end: s.end_at }))
      );

      const mts = (mt.data as { accepted_slot: { start: string; end: string } | null }[] | null) ?? [];
      setAccepted(
        mts
          .map((m) => m.accepted_slot)
          .filter((s): s is { start: string; end: string } => !!s)
      );

      const fts = (feat.data as { start_at: string; end_at: string }[] | null) ?? [];
      setFeatured(fts.map((s) => ({ start: s.start_at, end: s.end_at })));
    })();
  }, [supabase]);

  useEffect(() => {
    (async () => {
      const [availability, meetings] = await Promise.all([
        supabase
          .from("availability_slots")
          .select("slot_start, status")
          .eq("user_id", inviteeId),
        supabase
          .from("meetings")
          .select("accepted_slot")
          .or(`requester_id.eq.${inviteeId},invitee_id.eq.${inviteeId}`)
          .eq("status", "accepted"),
      ]);

      const availRows =
        (availability.data as { slot_start: string; status: InviteeSlotStatus }[] | null) ?? [];
      setInviteeSlots(
        new Map(availRows.map((r) => [new Date(r.slot_start).toISOString(), r.status]))
      );
      const hasSet = availRows.length > 0;
      setInviteeHasSetAvailability(hasSet);
      onInviteeAvailabilityKnown?.(hasSet);

      const inviteeAcceptedSlots =
        ((meetings.data as { accepted_slot: { start: string; end: string } | null }[] | null) ?? [])
          .flatMap((m) =>
            m.accepted_slot
              ? [
                  {
                    start: new Date(m.accepted_slot.start).toISOString(),
                    end: new Date(m.accepted_slot.end).toISOString(),
                  },
                ]
              : []
          );
      setInviteeAccepted(inviteeAcceptedSlots);
      setInviteeOccupiedStarts(new Set(inviteeAcceptedSlots.map((s) => s.start)));
    })();
  }, [inviteeId, supabase, onInviteeAvailabilityKnown]);

  function isPicked(s: Slot): boolean {
    return selected.some((p) => p.start === s.start);
  }

  // A slot is pickable when:
  //   - the invitee marked it available, OR
  //   - the invitee hasn't set any availability at all (open-propose mode)
  // …and it doesn't collide with one of their already-accepted meetings or
  // with one of the proposer's accepted meetings.
  const isPickable = useCallback(
    (s: Slot): boolean => {
      if (inviteeOccupiedStarts.has(s.start)) return false;
      if (accepted.some((m) => new Date(s.start) < new Date(m.end) && new Date(m.start) < new Date(s.end))) {
        return false;
      }
      if (inviteeHasSetAvailability === false) return true;
      return inviteeSlots?.get(s.start) === "available";
    },
    [accepted, inviteeHasSetAvailability, inviteeOccupiedStarts, inviteeSlots]
  );

  function toggle(s: Slot) {
    if (isPicked(s)) {
      onChange(selected.filter((p) => p.start !== s.start));
      return;
    }
    if (!isPickable(s)) return;
    let next = [...selected, s];
    if (next.length > max) next = next.slice(next.length - max);
    onChange(next);
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const hour = slotLabel(s).split(":")[0];
      const period = slotLabel(s).slice(-2);
      const key = `${hour} ${period}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries());
  }, [slots]);

  const openProposeMode = inviteeHasSetAvailability === false;
  const suggestionReady = inviteeHasSetAvailability !== null;

  function handleSuggest() {
    const picks = suggestThreeSlots({
      candidates: slots,
      isPickable,
      featured,
      inviteeAccepted,
      bookmarks: bookmarked,
    });
    onChange(picks.slice(0, max));
  }

  return (
    <div className="space-y-3">
      {openProposeMode ? (
        <p className="text-[12px] leading-snug text-brand-900">
          They haven&apos;t set availability yet. Pick any time — both of you will see this is
          <span className="font-semibold"> proposed outside availability</span>.
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleSuggest}
        disabled={!suggestionReady}
        className="flex w-full items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Suggest 3 times for me
      </button>

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <LegendDot color="bg-white border border-slate-300" /> Open
        <LegendDot color="bg-slate-100 border border-slate-200" /> Taken
        <LegendDot color="bg-brand-800" /> Picked
      </div>

      <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
        {grouped.map(([hour, items]) => (
          <div key={hour}>
            <div className="mb-1 text-[10px] font-medium uppercase tracking-wider tabular-nums text-slate-500">
              {hour}
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {items.map((s) => {
                const c = classifySlot(s, bookmarked, accepted);
                const occupied = inviteeOccupiedStarts.has(s.start);
                const pickable = isPickable(s);
                const picked = isPicked(s);
                const disabled = !pickable || (c === "hard" && !picked);
                return (
                  <button
                    key={s.start}
                    type="button"
                    onClick={() => toggle(s)}
                    disabled={disabled}
                    aria-pressed={picked}
                    aria-label={`${slotLabel(s)} ${
                      picked ? "picked" : pickable ? "open" : occupied ? "taken" : "taken"
                    }`}
                    className={cn(
                      "flex h-10 flex-col items-center justify-center rounded-md border text-[11px] font-medium leading-tight tabular-nums transition-colors",
                      pickable
                        ? conflictStyles(c, picked)
                        : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                    )}
                  >
                    <span>{slotLabel(s)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-slate-500">
        Pick up to {max} times. They pick one to confirm — nothing&apos;s booked until then.
      </div>
    </div>
  );
}

function LegendDot({ color }: { color: string }) {
  return <span className={cn("inline-block h-3 w-3 rounded", color)} />;
}

function conflictStyles(c: SlotConflict, picked: boolean): string {
  if (picked) return "bg-brand-800 text-white border-brand-800";
  switch (c) {
    case "free":
      return "bg-white text-slate-700 border-slate-300 hover:bg-slate-50";
    case "soft":
      return "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100";
    case "hard":
      return "bg-iit-50 text-iit-700 border-iit-200 opacity-60 cursor-not-allowed";
  }
}
