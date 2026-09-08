"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { CalendarOff, Check, Clock4, Loader2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { formatInTimeZone } from "date-fns-tz";
import { SUMMIT_TZ } from "@/lib/constants";
import { rangeIST } from "@/lib/date";
import {
  buildAvailabilitySlots,
  classifySlot,
  slotHourIST,
  type Slot,
} from "@/lib/slots";
import { createClient } from "@/lib/supabase/client";
import { cn, initials } from "@/lib/utils";
import { SlotPicker } from "@/components/features/slot-picker";

interface MiniProfile {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  designation: string | null;
  company: string | null;
}

export interface MeetingRow {
  id: string;
  requester_id: string;
  invitee_id: string;
  message: string | null;
  location: string | null;
  proposed_slots: Slot[] | null;
  accepted_slot: Slot | null;
  status: "pending" | "accepted" | "declined" | "rescheduled" | "cancelled";
  proposed_outside_availability: boolean | null;
  created_at: string;
  requester: MiniProfile | null;
  invitee: MiniProfile | null;
}

type Tab = "by-me" | "by-others";
type AvailStatus = "available" | "booked" | "blocked";

interface AvailabilityRow {
  slot_start: string;
  slot_end: string;
  status: AvailStatus;
}

export function MeetingsView({
  userId,
  meetings,
  bookmarks,
}: {
  userId: string | null;
  meetings: MeetingRow[];
  bookmarks: { id: string; title: string; start_at: string; end_at: string }[];
}) {
  const [tab, setTab] = useState<Tab>("by-me");
  const [availOpen, setAvailOpen] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<MeetingRow | null>(null);
  const [rescheduleSlots, setRescheduleSlots] = useState<Slot[]>([]);
  const [, startTransition] = useTransition();

  const byMe = useMemo(
    () => meetings.filter((m) => m.requester_id === userId),
    [meetings, userId]
  );
  const byOthers = useMemo(
    () => meetings.filter((m) => m.invitee_id === userId),
    [meetings, userId]
  );
  const accepted = useMemo(
    () => meetings.filter((m) => m.status === "accepted"),
    [meetings]
  );

  const myAcceptedWindows: Slot[] = useMemo(
    () =>
      accepted.flatMap((m) => {
        const s = asSlot(m.accepted_slot);
        return s ? [s] : [];
      }),
    [accepted]
  );

  const myBookmarkWindows = useMemo(
    () =>
      bookmarks
        .filter((b) => typeof b.start_at === "string" && typeof b.end_at === "string")
        .map((b) => ({ start: b.start_at, end: b.end_at })),
    [bookmarks]
  );

  async function accept(meetingId: string, slot: Slot) {
    setPendingId(meetingId);
    startTransition(async () => {
      const res = await fetch("/api/meetings/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: meetingId, slot }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setPendingId(null);
      if (!res.ok) {
        if (
          data.error === "conflict" ||
          data.error === "slot_occupied" ||
          data.error === "slot_not_available"
        ) {
          toast({
            title: "That slot is no longer free",
            description: "Try a different proposed slot.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Could not accept",
            description: data.error ?? "Try again.",
            variant: "destructive",
          });
        }
        return;
      }
      toast({ title: "Meeting accepted" });
      router.refresh();
    });
  }

  async function decline(meetingId: string) {
    setPendingId(meetingId);
    startTransition(async () => {
      const res = await fetch("/api/meetings/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: meetingId }),
      });
      setPendingId(null);
      if (!res.ok) {
        toast({ title: "Could not decline", variant: "destructive" });
        return;
      }
      router.refresh();
    });
  }

  async function cancelMeeting(meetingId: string) {
    if (!window.confirm("Cancel this meeting?")) return;
    setPendingId(meetingId);
    startTransition(async () => {
      const res = await fetch("/api/meetings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: meetingId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setPendingId(null);
      if (!res.ok) {
        toast({
          title: "Could not cancel",
          description: data.error ?? "Try again.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Meeting cancelled" });
      router.refresh();
    });
  }

  function openReschedule(m: MeetingRow) {
    setRescheduling(m);
    setRescheduleSlots([]);
  }

  async function submitReschedule() {
    if (!rescheduling) return;
    if (rescheduleSlots.length === 0) {
      toast({ title: "Pick at least one slot", variant: "destructive" });
      return;
    }

    setPendingId(rescheduling.id);
    startTransition(async () => {
      const res = await fetch("/api/meetings/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meeting_id: rescheduling.id,
          proposed_slots: rescheduleSlots,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setPendingId(null);
      if (!res.ok) {
        const slotUnavailable =
          data.error === "slot_not_available" || data.error === "slot_occupied";
        toast({
          title: "Could not reschedule",
          description: slotUnavailable
            ? "One of those slots is no longer available."
            : data.error ?? "Try again.",
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Reschedule request sent" });
      setRescheduling(null);
      setRescheduleSlots([]);
      router.refresh();
    });
  }

  const rescheduleInviteeId = rescheduling
    ? rescheduling.requester_id === userId
      ? rescheduling.invitee_id
      : rescheduling.requester_id
    : null;
  const rescheduleOther = rescheduling
    ? rescheduling.requester_id === userId
      ? rescheduling.invitee
      : rescheduling.requester
    : null;

  return (
    <>
      <MeetingsGraph meetings={accepted} />

      {/* Availability button */}
      <button
        type="button"
        onClick={() => setAvailOpen(true)}
        className="flex w-full items-center justify-between rounded-lg border border-brand-100 bg-white px-4 py-3.5 text-left transition-colors hover:bg-brand-50/30"
      >
        <span className="flex items-center gap-3">
          <Clock4 className="size-[18px] text-brand-800" strokeWidth={1.5} />
          <span className="flex flex-col leading-tight">
            <span className="text-[13px] font-semibold text-brand-950">
              My availability
            </span>
            <span className="text-[11px] text-brand-900/65">
              Pick 15-min blocks on 16 May 2026
            </span>
          </span>
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-800/75">
          Open
        </span>
      </button>

      {/* Filter buttons — separate cards so each reads as its own action */}
      <div className="grid grid-cols-2 gap-2">
        <FilterButton
          active={tab === "by-me"}
          onClick={() => setTab("by-me")}
          label="Scheduled by me"
          count={byMe.length}
        />
        <FilterButton
          active={tab === "by-others"}
          onClick={() => setTab("by-others")}
          label="Scheduled by others"
          count={byOthers.length}
        />
      </div>

      {/* List */}
      {tab === "by-me" ? (
        byMe.length === 0 ? (
          <EmptyMsg
            title="No meetings yet"
            body="Open an attendee profile and tap Schedule Meeting to send a request."
          />
        ) : (
          <ul className="space-y-3">
            {byMe.map((m) => (
              <SentRow
                key={m.id}
                m={m}
                pendingId={pendingId}
                onCancel={cancelMeeting}
                onReschedule={openReschedule}
              />
            ))}
          </ul>
        )
      ) : null}

      {tab === "by-others" ? (
        byOthers.length === 0 ? (
          <EmptyMsg
            title="No requests yet"
            body="When someone asks to meet, it'll show up here."
          />
        ) : (
          <ul className="space-y-3">
            {byOthers.map((m) => (
              <InboxRow
                key={m.id}
                m={m}
                pendingId={pendingId}
                myBookmarkWindows={myBookmarkWindows}
                myAcceptedWindows={myAcceptedWindows}
                onAccept={accept}
                onDecline={decline}
                onCancel={cancelMeeting}
                onReschedule={openReschedule}
              />
            ))}
          </ul>
        )
      ) : null}

      {userId ? (
        <AvailabilitySheet
          open={availOpen}
          onOpenChange={setAvailOpen}
          userId={userId}
          acceptedWindows={myAcceptedWindows}
        />
      ) : null}

      <Sheet
        open={!!rescheduling}
        onOpenChange={(v) => {
          if (!v) {
            setRescheduling(null);
            setRescheduleSlots([]);
          }
        }}
      >
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Reschedule meeting</SheetTitle>
            <SheetDescription>
              Pick new available times for {rescheduleOther?.full_name ?? "the other person"}.
            </SheetDescription>
          </SheetHeader>
          <div className="px-6 pb-6 pt-3">
            {rescheduleInviteeId ? (
              <SlotPicker
                inviteeId={rescheduleInviteeId}
                selected={rescheduleSlots}
                onChange={setRescheduleSlots}
                max={3}
              />
            ) : null}
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setRescheduling(null);
                  setRescheduleSlots([]);
                }}
                className="rounded-md"
              >
                Cancel
              </Button>
              <Button
                onClick={submitReschedule}
                disabled={!rescheduling || pendingId === rescheduling.id}
                className="rounded-md"
              >
                {rescheduling && pendingId === rescheduling.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Send request"
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function FilterButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-colors",
        active
          ? "border-brand-800 bg-brand-800 text-white"
          : "border-brand-100 bg-white text-brand-900 hover:bg-brand-50/40"
      )}
    >
      <span className="text-[13px] font-semibold leading-tight">{label}</span>
      <span
        className={cn(
          "text-[11px] font-medium",
          active ? "text-white/75" : "text-brand-800/70"
        )}
      >
        {count} {count === 1 ? "meeting" : "meetings"}
      </span>
    </button>
  );
}

function MeetingsGraph({ meetings }: { meetings: MeetingRow[] }) {
  // Hourly buckets 8am→10pm, 14 columns. Cleaner column density reads more
  // like a real chart than 7 wide bars and surfaces the busy/quiet hours.
  const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
  const counts = HOURS.map(() => 0);
  for (const m of meetings) {
    const s = asSlot(m.accepted_slot);
    if (!s) continue;
    const h = slotHourIST(s.start);
    const idx = HOURS.indexOf(h);
    if (idx >= 0) counts[idx] += 1;
  }
  const max = Math.max(1, ...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  const peakHour = counts.indexOf(max);
  const peakLabel =
    total === 0
      ? "No meetings yet"
      : `Peak ${formatHourLabel(HOURS[peakHour])}`;

  return (
    <div className="rounded-lg border border-brand-100 bg-white px-4 pb-4 pt-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-[13px] font-semibold tracking-tight text-brand-950">
            Day at a glance
          </h2>
          <p className="mt-0.5 text-[11px] text-brand-900/65">{peakLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-[20px] font-semibold leading-none tabular-nums text-brand-950">
            {total}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-800/65">
            confirmed
          </p>
        </div>
      </div>

      <div className="mt-3 flex h-20 items-end gap-[3px]">
        {HOURS.map((h, i) => {
          const c = counts[i];
          const heightPct = (c / max) * 100;
          return (
            <div
              key={h}
              className="group relative flex h-full flex-1 items-end"
              title={`${formatHourLabel(h)} — ${c} ${c === 1 ? "meeting" : "meetings"}`}
            >
              <div
                className={cn(
                  "w-full rounded-sm transition-all",
                  c > 0 ? "bg-brand-800" : "bg-brand-50"
                )}
                style={{ height: `${Math.max(c > 0 ? 12 : 6, heightPct)}%` }}
                aria-hidden
              />
              {c > 0 ? (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-semibold tabular-nums text-brand-800/85">
                  {c}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-medium tabular-nums text-brand-800/65">
        <span>8a</span>
        <span>12p</span>
        <span>4p</span>
        <span>9p</span>
      </div>
    </div>
  );
}

function formatHourLabel(h: number): string {
  if (h === 0) return "12a";
  if (h < 12) return `${h}a`;
  if (h === 12) return "12p";
  return `${h - 12}p`;
}

function InboxRow({
  m,
  pendingId,
  myBookmarkWindows,
  myAcceptedWindows,
  onAccept,
  onDecline,
  onCancel,
  onReschedule,
}: {
  m: MeetingRow;
  pendingId: string | null;
  myBookmarkWindows: { start: string; end: string }[];
  myAcceptedWindows: Slot[];
  onAccept: (id: string, slot: Slot) => void;
  onDecline: (id: string) => void;
  onCancel: (id: string) => void;
  onReschedule: (m: MeetingRow) => void;
}) {
  return (
    <li className="rounded-lg border border-brand-100 bg-white p-4">
      <div className="flex items-start gap-3">
        <Avatar className="size-10 shrink-0 ring-1 ring-brand-100">
          {m.requester?.photo_url ? (
            <AvatarImage src={m.requester.photo_url} alt="" />
          ) : null}
          <AvatarFallback className="bg-brand-50 text-brand-800">
            {initials(m.requester?.full_name ?? "?")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Link
            href={`/attendees/${m.requester?.id}`}
            className="text-sm font-semibold text-brand-950 hover:text-brand-800"
          >
            {m.requester?.full_name ?? "Attendee"}
          </Link>
          <div className="text-xs text-brand-900/70">
            {[m.requester?.designation, m.requester?.company].filter(Boolean).join(" · ")}
          </div>
        </div>
        <StatusPill status={m.status} />
      </div>

      {m.proposed_outside_availability ? <OutsideAvailabilityNote side="invitee" /> : null}

      {m.message ? (
        <p className="mt-3 whitespace-pre-line text-sm leading-6 text-brand-900">
          {m.message}
        </p>
      ) : null}
      {m.location ? (
        <p className="mt-1 text-xs text-brand-800/75">Location: {m.location}</p>
      ) : null}

      {m.status === "pending" ? (
        <>
          <div className="mt-3 space-y-1.5">
            {asSlotArray(m.proposed_slots).map((s) => {
              const c = classifySlot(s, myBookmarkWindows, myAcceptedWindows);
              return (
                <div
                  key={s.start}
                  className="flex items-center justify-between gap-2 rounded-lg border border-brand-100 bg-white px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <SlotState state={c} />
                    <span className="text-sm tabular-nums text-brand-900">
                      {formatInTimeZone(new Date(s.start), SUMMIT_TZ, "h:mm a")} –{" "}
                      {formatInTimeZone(new Date(s.end), SUMMIT_TZ, "h:mm a")}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onAccept(m.id, s)}
                    disabled={pendingId === m.id || c === "hard"}
                    className="h-8 rounded-full px-3"
                  >
                    {pendingId === m.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Accept
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDecline(m.id)}
              disabled={pendingId === m.id}
              className="h-8 rounded-full px-3"
            >
              <X className="h-3.5 w-3.5" />
              Decline
            </Button>
          </div>
        </>
      ) : (
        (() => {
          const s = asSlot(m.accepted_slot);
          return (
            <>
              {s ? (
                <p className="mt-3 text-sm font-medium tabular-nums text-brand-900">
                  {rangeIST(s.start, s.end)}
                </p>
              ) : null}
              {m.status === "accepted" ? (
                <MeetingActions
                  m={m}
                  pendingId={pendingId}
                  onCancel={onCancel}
                  onReschedule={onReschedule}
                />
              ) : null}
            </>
          );
        })()
      )}
    </li>
  );
}

function SentRow({
  m,
  pendingId,
  onCancel,
  onReschedule,
}: {
  m: MeetingRow;
  pendingId: string | null;
  onCancel: (id: string) => void;
  onReschedule: (m: MeetingRow) => void;
}) {
  const s = asSlot(m.accepted_slot);
  return (
    <li className="rounded-lg border border-brand-100 bg-white p-4">
      <div className="flex items-start gap-3">
        <Avatar className="size-10 shrink-0 ring-1 ring-brand-100">
          {m.invitee?.photo_url ? (
            <AvatarImage src={m.invitee.photo_url} alt="" />
          ) : null}
          <AvatarFallback className="bg-brand-50 text-brand-800">
            {initials(m.invitee?.full_name ?? "?")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Link
            href={`/attendees/${m.invitee?.id}`}
            className="text-sm font-semibold text-brand-950 hover:text-brand-800"
          >
            {m.invitee?.full_name ?? "Attendee"}
          </Link>
          <div className="text-xs text-brand-900/70">
            {[m.invitee?.designation, m.invitee?.company].filter(Boolean).join(" · ")}
          </div>
        </div>
        <StatusPill status={m.status} />
      </div>
      {m.proposed_outside_availability ? <OutsideAvailabilityNote side="requester" /> : null}
      {s ? (
        <p className="mt-3 text-sm font-medium tabular-nums text-brand-900">
          {rangeIST(s.start, s.end)}
        </p>
      ) : null}
      {m.status === "accepted" ? (
        <MeetingActions
          m={m}
          pendingId={pendingId}
          onCancel={onCancel}
          onReschedule={onReschedule}
        />
      ) : null}
    </li>
  );
}

function OutsideAvailabilityNote({ side }: { side: "requester" | "invitee" }) {
  return (
    <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-900">
      <CalendarOff className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} />
      <span>
        {side === "requester"
          ? "Proposed outside their availability — they hadn't set times when you reached out."
          : "Proposed outside your availability — you hadn't set times when this came in."}
      </span>
    </div>
  );
}

function MeetingActions({
  m,
  pendingId,
  onCancel,
  onReschedule,
}: {
  m: MeetingRow;
  pendingId: string | null;
  onCancel: (id: string) => void;
  onReschedule: (m: MeetingRow) => void;
}) {
  const pending = pendingId === m.id;
  return (
    <div className="mt-3 flex flex-col gap-2">
      <Link
        href={`/meetings/${m.id}`}
        className="inline-flex h-9 w-full items-center justify-center rounded-md bg-brand-800 px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-900"
      >
        Open chat
      </Link>
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onReschedule(m)}
          disabled={pending}
          className="h-9 rounded-md px-3"
        >
          {pending ? "Working..." : "Reschedule"}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onCancel(m.id)}
          disabled={pending}
          className="h-9 rounded-md px-3"
        >
          {pending ? "Working..." : "Cancel"}
        </Button>
      </div>
    </div>
  );
}

function EmptyMsg({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-brand-100 bg-white p-8 text-center">
      <h3 className="text-sm font-semibold text-brand-900">{title}</h3>
      <p className="mt-1 text-xs text-brand-900/70">{body}</p>
    </div>
  );
}

function SlotState({ state }: { state: "free" | "soft" | "hard" }) {
  const map = {
    free: { dot: "bg-brand-800", label: "Free" },
    soft: { dot: "bg-amber-500", label: "Soft conflict" },
    hard: { dot: "bg-iit-500", label: "Booked" },
  };
  const m = map[state];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-900/75">
      <span className={cn("size-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

function StatusPill({ status }: { status: MeetingRow["status"] }) {
  const style: Record<MeetingRow["status"], string> = {
    pending: "bg-amber-50 text-amber-700",
    accepted: "bg-emerald-50 text-emerald-700",
    declined: "bg-iit-50 text-iit-700",
    rescheduled: "bg-brand-50 text-brand-800",
    cancelled: "bg-brand-50 text-brand-800/70",
  };
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        style[status]
      )}
    >
      {status}
    </span>
  );
}

function AvailabilitySheet({
  open,
  onOpenChange,
  userId,
  acceptedWindows,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  acceptedWindows: Slot[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const grid = useMemo(() => buildAvailabilitySlots(), []);
  const [rows, setRows] = useState<AvailabilityRow[] | null>(null);
  const [pendingStarts, setPendingStarts] = useState<Set<string>>(new Set());

  // Status lookup: my-declared status overrides system "booked" inferred from
  // accepted meetings. Default = unset (treat as not available).
  // Keys are canonical ISO strings because Postgres timestamptz comes back as
  // "+00:00" while our slot ISO is "...000Z" — same instant, different text.
  const lookup = useMemo(() => {
    const m = new Map<string, AvailStatus>();
    for (const r of rows ?? []) {
      m.set(new Date(r.slot_start).toISOString(), r.status);
    }
    return m;
  }, [rows]);

  const acceptedStarts = useMemo(() => {
    const s = new Set<string>();
    for (const a of acceptedWindows) s.add(a.start);
    return s;
  }, [acceptedWindows]);

  const fetchAvail = useCallback(async () => {
    const { data, error } = await supabase
      .from("availability_slots")
      .select("slot_start, slot_end, status")
      .eq("user_id", userId);
    if (error) {
      toast({
        title: "Could not load availability",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setRows((data as AvailabilityRow[] | null) ?? []);
  }, [supabase, toast, userId]);

  useEffect(() => {
    if (!open) return;
    void fetchAvail();
  }, [open, fetchAvail]);

  async function setStatus(slot: Slot, next: AvailStatus) {
    setPendingStarts((cur) => new Set(cur).add(slot.start));
    setRows((cur) => {
      const rows = cur ?? [];
      const withoutSlot = rows.filter(
        (r) => new Date(r.slot_start).toISOString() !== slot.start
      );
      return [
        ...withoutSlot,
        {
          slot_start: slot.start,
          slot_end: slot.end,
          status: next,
        },
      ];
    });

    try {
      const res = await fetch("/api/availability/slot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, status: next }),
      });
      if (res.ok) return;

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      await fetchAvail();
      toast({
        title: "Could not save availability",
        description: data.error ?? "Try again.",
        variant: "destructive",
      });
    } catch {
      await fetchAvail();
      toast({
        title: "Could not save availability",
        description: "Check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setPendingStarts((cur) => {
        const nextPending = new Set(cur);
        nextPending.delete(slot.start);
        return nextPending;
      });
    }
  }

  function effectiveStatus(slot: Slot): AvailStatus | null {
    if (acceptedStarts.has(slot.start)) return "booked";
    return lookup.get(slot.start) ?? null;
  }

  // Every tap is saved immediately: selected = available, unselected = blocked.
  // Booked slots from accepted meetings are immutable.
  function toggle(slot: Slot) {
    const cur = effectiveStatus(slot);
    if (cur === "booked") return;
    void setStatus(slot, cur === "available" ? "blocked" : "available");
  }

  // Group slots into morning (8-12), afternoon (12-17), evening (17-22)
  const sections = [
    { label: "Morning", slots: grid.filter((s) => slotHourIST(s.start) < 12) },
    {
      label: "Afternoon",
      slots: grid.filter(
        (s) => slotHourIST(s.start) >= 12 && slotHourIST(s.start) < 17
      ),
    },
    { label: "Evening", slots: grid.filter((s) => slotHourIST(s.start) >= 17) },
  ];

  const availableCount = grid.filter((slot) => effectiveStatus(slot) === "available").length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>My availability · 16 May 2026</SheetTitle>
          <SheetDescription>
            Tap to save a slot as available. Tap again to save it as not available.
          </SheetDescription>
        </SheetHeader>
        <div className="px-6 pb-6 pt-3">
          <div className="mb-3 flex items-center justify-between rounded-lg border border-brand-100 bg-brand-50/50 px-3 py-2 text-[12px] font-semibold text-brand-900">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-brand-800" aria-hidden />
              Available slots
            </span>
            <span className="tabular-nums text-brand-800">
              {rows === null ? "..." : availableCount}
            </span>
          </div>
          <Legend />

          {rows === null ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-5 animate-spin text-brand-800/60" />
            </div>
          ) : (
            <div className="space-y-5">
              {sections.map((sec) => (
                <div key={sec.label}>
                  <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-800/75">
                    {sec.label}
                  </h3>
                  <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                    {sec.slots.map((s) => {
                      const st = effectiveStatus(s);
                      const isPending = pendingStarts.has(s.start);
                      const notAvailable = !st || st === "blocked";
                      return (
                        <button
                          key={s.start}
                          type="button"
                          onClick={() => toggle(s)}
                          disabled={st === "booked" || isPending}
                          aria-pressed={st === "available"}
                          aria-label={`${formatInTimeZone(
                            new Date(s.start),
                            SUMMIT_TZ,
                            "h:mm a"
                          )} ${st ?? "not available"}`}
                          className={cn(
                            "flex min-h-11 flex-col items-center justify-center rounded-md border px-2 py-2 text-[12px] font-semibold leading-tight tabular-nums transition-colors",
                            st === "available" &&
                              "border-brand-800 bg-brand-800 text-white shadow-sm",
                            st === "booked" &&
                              "cursor-not-allowed border-emerald-300 bg-emerald-50 text-emerald-700",
                            notAvailable &&
                              "border-slate-200 bg-slate-100 text-slate-500 hover:border-brand-300 hover:bg-brand-50/50",
                            isPending && "opacity-60"
                          )}
                        >
                          <span>{formatInTimeZone(new Date(s.start), SUMMIT_TZ, "h:mm a")}</span>
                          {st === "booked" ? (
                            <span className="text-[9px] font-semibold uppercase tracking-wide">
                              Occupied
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Legend() {
  return (
    <div className="mb-4 flex flex-wrap gap-3 text-[11px] font-medium text-brand-900/75">
      <Swatch className="bg-brand-800" label="Available" />
      <Swatch className="border border-slate-200 bg-slate-100" label="Not available" />
      <Swatch className="border border-emerald-300 bg-emerald-50" label="Occupied" />
    </div>
  );
}

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-sm", className)} />
      {label}
    </span>
  );
}

function asSlot(v: unknown): Slot | null {
  if (
    v &&
    typeof v === "object" &&
    "start" in v &&
    "end" in v &&
    typeof (v as { start: unknown }).start === "string" &&
    typeof (v as { end: unknown }).end === "string"
  ) {
    return { start: (v as Slot).start, end: (v as Slot).end };
  }
  return null;
}

function asSlotArray(v: unknown): Slot[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((s) => {
    const out = asSlot(s);
    return out ? [out] : [];
  });
}
