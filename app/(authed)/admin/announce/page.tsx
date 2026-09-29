import Image from "next/image";
import Link from "next/link";
import { organizerClient, Restricted } from "../guard";
import { AnnouncementComposer } from "../announcement-composer";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncePage() {
  const supabase = await organizerClient();
  if (!supabase) return <Restricted />;

  return (
    <div className="mx-auto w-full max-w-2xl pb-10 pt-5 lg:pt-8">
      <Link href="/admin" className="text-[13px] text-brand-800">
        &larr; Admin
      </Link>
      <div className="mt-2 flex items-center gap-3">
        <Image src="/ui/admin/announce.webp" alt="" width={512} height={512} sizes="64px" className="size-16" />
        <div>
          <h1 className="font-display text-2xl font-semibold text-brand-950">Announcements</h1>
        </div>
      </div>
      <div className="mt-5">
        <AnnouncementComposer />
      </div>
    </div>
  );
}
