import { QrScanner } from "@/components/features/qr-scanner";

export const dynamic = "force-dynamic";

export default function ScanPage() {
  return (
    <div className="mx-auto w-full max-w-md space-y-5 pb-12 pt-4">
      <section className="rounded-lg border border-brand-100 bg-white p-5">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-950">
          Scan QR
        </h1>
        <p className="mt-1 text-sm leading-6 text-brand-900/75">
          Point your camera at another attendee&apos;s badge to connect with
          them instantly.
        </p>
        <div className="mt-5">
          <QrScanner />
        </div>
      </section>
    </div>
  );
}
