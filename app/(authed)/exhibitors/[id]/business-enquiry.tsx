"use client";

import { useState, useTransition } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

/**
 * "Business enquiry" at the foot of a stall's page: a form that slides up
 * from the bottom and goes to that stall's team (0032_exhibitor_enquiries).
 * Signed in, the person's own details are already filled in.
 */

export type EnquiryPrefill = {
  userId: string | null;
  name: string;
  email: string;
  company: string;
  designation: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE = 2000;

export function BusinessEnquiry({
  exhibitorId,
  exhibitorName,
  prefill,
}: {
  exhibitorId: string;
  exhibitorName: string;
  prefill: EnquiryPrefill;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: prefill.name,
    email: prefill.email,
    company: prefill.company,
    designation: prefill.designation,
    message: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const message = form.message.trim();
    if (!name) return setError("Please add your name.");
    if (!EMAIL.test(email)) return setError("Please add a valid email address.");
    if (!message) return setError("Please write your message.");
    setError(null);
    startTransition(async () => {
      const { error: err } = await createClient()
        .from("exhibitor_enquiries")
        .insert({
          exhibitor_id: exhibitorId,
          user_id: prefill.userId,
          name,
          email,
          company: form.company.trim() || null,
          designation: form.designation.trim() || null,
          message,
        });
      if (err) {
        setError(
          /fetch|network/i.test(err.message)
            ? "No signal right now. Please try again when you're back online."
            : "Could not send your enquiry. Please try again."
        );
        return;
      }
      setSent(true);
      setForm((f) => ({ ...f, message: "" }));
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSent(false);
          setOpen(true);
        }}
        className="mt-3 flex h-12 w-full items-center justify-center rounded-[4px] bg-brand-800 text-[15px] font-semibold text-white transition-colors hover:bg-brand-900"
      >
        Business enquiry
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mx-auto w-full max-w-2xl px-5 pt-5 pb-[max(env(safe-area-inset-bottom),20px)]">
          <SheetHeader className="p-0 text-left">
            <SheetTitle className="text-brand-950">Business enquiry</SheetTitle>
            <SheetDescription>Your details and message go to the team at {exhibitorName}.</SheetDescription>
          </SheetHeader>

          {sent ? (
            <div className="py-8 text-center">
              <SentTick />
              <p className="mt-4 text-[16px] font-semibold text-brand-950">Enquiry sent</p>
              <p className="mt-1 text-[14px] text-brand-900/70">
                {exhibitorName} will get back to you at {form.email.trim()}.
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-5 h-11 rounded-[4px] border border-brand-800 px-6 text-[14px] font-medium text-brand-800"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-3.5" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="enq-name">Name</Label>
                <Input id="enq-name" value={form.name} onChange={set("name")} autoComplete="name" maxLength={120} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="enq-email">Email</Label>
                <Input
                  id="enq-email"
                  type="email"
                  inputMode="email"
                  value={form.email}
                  onChange={set("email")}
                  autoComplete="email"
                  maxLength={200}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="enq-company">Company / Institute</Label>
                <Input id="enq-company" value={form.company} onChange={set("company")} autoComplete="organization" maxLength={160} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="enq-designation">Designation</Label>
                <Input id="enq-designation" value={form.designation} onChange={set("designation")} autoComplete="organization-title" maxLength={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="enq-message">Message</Label>
                <Textarea
                  id="enq-message"
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value.slice(0, MAX_MESSAGE) }))}
                  placeholder={`What would you like to discuss with ${exhibitorName}?`}
                  rows={4}
                  required
                />
              </div>
              {error ? <p className="text-[13px] text-red-700">{error}</p> : null}
              <button
                type="submit"
                disabled={pending}
                className="flex h-12 w-full items-center justify-center rounded-[4px] bg-brand-800 text-[15px] font-semibold text-white transition-colors hover:bg-brand-900 disabled:opacity-60"
              >
                {pending ? "Sending…" : "Send enquiry"}
              </button>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

/**
 * The ring is drawn, then the check is written into it: two strokes in the
 * brand colour, one after the other, the way you would tick it by hand.
 * Flat, with no shadow, glow or bounce. Reduced motion shows it finished.
 */
function SentTick() {
  return (
    <svg viewBox="0 0 56 56" className="mx-auto size-14 text-brand-800" fill="none" aria-hidden>
      <style>{`
        .enq-ring { stroke-dasharray: 151; stroke-dashoffset: 151; animation: enq-draw 420ms cubic-bezier(.65,0,.35,1) forwards; }
        .enq-check { stroke-dasharray: 30; stroke-dashoffset: 30; animation: enq-draw 260ms cubic-bezier(.65,0,.35,1) 380ms forwards; }
        @keyframes enq-draw { to { stroke-dashoffset: 0; } }
        @media (prefers-reduced-motion: reduce) { .enq-ring, .enq-check { animation: none; stroke-dashoffset: 0; } }
      `}</style>
      <circle className="enq-ring" cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="2.5" transform="rotate(-90 28 28)" />
      <path className="enq-check" d="M18 29l7 7 13-15" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
