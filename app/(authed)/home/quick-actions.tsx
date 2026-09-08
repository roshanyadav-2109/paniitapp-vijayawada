"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarDays,
  Mail,
  Megaphone,
  QrCode,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { MyQrDialog } from "@/components/features/my-qr-dialog";

interface Props {
  role: string | null;
}

export function QuickActions({ role }: Props) {
  const [qrOpen, setQrOpen] = useState(false);
  const canVerify = role === "volunteer" || role === "admin";
  const canAnnounce = role === "organizer" || role === "admin";

  return (
    <>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <button
          type="button"
          onClick={() => setQrOpen(true)}
          className="flex items-center gap-3 rounded-lg border border-brand-100 bg-white px-3.5 py-3 lg:px-4 lg:py-4 text-left transition-colors hover:bg-brand-50/30"
        >
          <QrCode className="size-[18px] text-brand-800" strokeWidth={1.5} />
          <span className="text-[13px] font-semibold leading-tight text-brand-950">
            My QR
          </span>
        </button>
        <ActionLink
          href="/scan"
          icon={<ScanLine className="size-[18px]" strokeWidth={1.5} />}
          label="Scan QR"
        />
        <ActionLink
          href="mailto:summit@paniit.org"
          icon={<Mail className="size-[18px]" strokeWidth={1.5} />}
          label="Contact us"
        />
        <ActionLink
          href="/agenda"
          icon={<CalendarDays className="size-[18px]" strokeWidth={1.5} />}
          label="Agenda"
        />
      </div>

      {canVerify ? (
        <Link
          href="/scan?mode=verify"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-800 px-4 py-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-900"
        >
          <ShieldCheck className="size-[18px]" strokeWidth={1.6} />
          Verify Attendee
        </Link>
      ) : null}

      {canAnnounce ? (
        <Link
          href="/admin#announce"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-brand-800 bg-white px-4 py-3.5 text-[13px] font-semibold text-brand-800 transition-colors hover:bg-brand-50"
        >
          <Megaphone className="size-[18px]" strokeWidth={1.6} />
          Post Announcement
        </Link>
      ) : null}

      <MyQrDialog open={qrOpen} onOpenChange={setQrOpen} />
    </>
  );
}

function ActionLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-brand-100 bg-white px-3.5 py-3 lg:px-4 lg:py-4 transition-colors hover:bg-brand-50/30"
    >
      <span className="text-brand-800">{icon}</span>
      <span className="text-[13px] font-semibold leading-tight text-brand-950">
        {label}
      </span>
    </Link>
  );
}
