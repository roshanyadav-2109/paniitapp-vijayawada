"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { ProfileAvatar } from "@/components/features/default-avatar";
import { EVENT_NAME } from "@/lib/event-config";
import { GatePassQr } from "./gatepass-qr";

interface PassProfile {
  full_name: string | null;
  designation: string | null;
  company: string | null;
  iit_campus: string | null;
  graduation_year: number | null;
  photo_url: string | null;
  qr_token: string | null;
}

// Derive a human-readable Pass No. from the user's UUID — first 8 hex chars
// split 4-4, prefixed with the event short code. Stable per user, no DB
// change needed, and reads like a real conference badge ID.
function passNumberFromId(userId: string): string {
  const hex = userId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `PI26-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

export function GatePassDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [p, setP] = useState<PassProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select(
          "full_name, designation, company, iit_campus, graduation_year, photo_url, qr_token"
        )
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setUserId(user.id);
      setP((data as PassProfile | null) ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, supabase]);

  const passNo = userId ? passNumberFromId(userId) : null;
  // iit_campus is already stored with the "IIT " prefix (e.g. "IIT Bombay"),
  // so just print it as-is — don't prepend another "IIT".
  const iitLine = p
    ? [p.iit_campus, p.graduation_year].filter(Boolean).join(" · ")
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden p-0 [&>button]:text-brand-900 [&>button]:opacity-100">
        <DialogHeader className="space-y-0 border-b border-brand-100 bg-white px-5 py-4">
          {/* Title/description are required by Radix for screen-reader labels
              but visually we want the logo + "GATE PASS" on a single row. */}
          <DialogTitle className="sr-only">
            {EVENT_NAME} — Gate Pass
          </DialogTitle>
          <DialogDescription className="sr-only">
            Your single-attendee venue entry pass.
          </DialogDescription>
          <div className="flex items-center justify-between gap-3 pr-7">
            <Image
              src="/logo/paniit.png"
              alt={EVENT_NAME}
              width={520}
              height={196}
              priority
              className="h-8 w-auto"
            />
            <span className="shrink-0 text-[13px] font-semibold uppercase tracking-[0.18em] text-brand-950">
              Gate Pass
            </span>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-brand-800/60" />
          </div>
        ) : !p || !p.qr_token ? (
          <p className="px-5 py-8 text-sm text-brand-800/75">
            Your gate pass isn&apos;t ready yet — finish onboarding first.
          </p>
        ) : (
          <div className="space-y-4 px-5 pb-5 pt-4">
            <div className="flex items-center gap-3">
              <ProfileAvatar
                photoUrl={p.photo_url}
                name={p.full_name}
                className="size-14 shrink-0"
                ringClassName="ring-2 ring-brand-50"
              />
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-brand-950">
                  {p.full_name ?? "Attendee"}
                </p>
                {p.designation || p.company ? (
                  <p className="truncate text-[12px] text-brand-900/75">
                    {[p.designation, p.company].filter(Boolean).join(" · ")}
                  </p>
                ) : null}
                {iitLine ? (
                  <p className="truncate text-[11px] text-brand-800/70">
                    {iitLine}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-md border border-dashed border-brand-200 bg-white p-3">
              <GatePassQr token={p.qr_token} />
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-800/60">
                  Pass No.
                </p>
                <p className="font-mono text-[14px] font-semibold tracking-wide text-brand-950">
                  {passNo}
                </p>
              </div>
              <p className="max-w-[160px] text-right text-[10px] leading-tight text-brand-800/60">
                Present at venue gate. Single-attendee entry pass.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
