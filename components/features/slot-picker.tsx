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
import { EVENT_ID } from "@/lib/event-config";

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
          .eq("event_id", EVENT_ID)
          .or(`requester_id.eq.${user.id},invitee_id.eq.${user.id}`)
          .eq("status", "accepted"),
        supabase
          .from("sessions")
          .select("start_at, end_at")
          .eq("event_id", EVENT_ID)
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
          .eq("event_id", EVENT_ID)
          .eq("user_id", inviteeId),
        supabase
          .from("meetings")
          .select("accepted_slot")
          .eq("event_id", EVENT_ID)
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
        className="flex w-full items-center justify-center rounded-md bg-brand-800 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Suggest 3 times for me
      </button>

      {/* Traffic lights rather than shades of the brand: free, awkward,
          gone. Nobody has to learn what navy means. */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-brand-900/60">
        <LegendDot color="bg-white border border-rule-strong" /> Free
        <LegendDot color="bg-amber-100 border border-amber-400" /> Clashes
        <LegendDot color="bg-red-100 border border-red-300" /> Unavailable
        <LegendDot color="bg-emerald-600 border border-emerald-600" /> Picked
      </div>

      <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
        {grouped.map(([hour, items]) => (
          <div key={hour}>
            <div className="mb-1 eyebrow tabular-nums text-brand-900/60">
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
                        // Their time, not yours: red, and not selectable.
                        : "cursor-not-allowed border-red-200 bg-red-50 text-red-700/70"
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

      <div className="text-xs text-brand-900/60">
        Pick up to {max} times. They pick one to confirm — nothing&apos;s booked until then.
      </div>
    </div>
  );
}

function LegendDot({ color }: { color: string }) {
  return <span className={cn("inline-block h-3 w-3 rounded", color)} />;
}

function conflictStyles(c: SlotConflict, picked: boolean): string {
  // Green is reserved for the one thing you chose, which is the only cell
  // on the grid that should draw the eye.
  if (picked) return "bg-emerald-600 text-white border-emerald-600";
  switch (c) {
    // Plain, because it is the ordinary case: most of the grid is free, and
    // a wall of green says as little as a wall of navy did. The colours are
    // for the two states worth noticing.
    case "free":
      return "bg-white text-brand-900/80 border-rule-strong hover:bg-paper";
    // Something of yours is already here — a session you bookmarked — but it
    // is yours to give up, so it stays choosable.
    case "soft":
      return "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100";
    case "hard":
      return "bg-red-50 text-red-700 border-red-200 opacity-70 cursor-not-allowed";
  }
}
