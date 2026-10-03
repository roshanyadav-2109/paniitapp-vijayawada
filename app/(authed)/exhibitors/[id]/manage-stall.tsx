"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  addTeamMember,
  removeTeamMember,
  updateMyExhibitor,
  type MyExhibitorInput,
} from "@/app/actions/exhibitor";
import { createClient } from "@/lib/supabase/client";
import { EVENT_STORAGE_PREFIX } from "@/lib/event-config";
import { cn } from "@/lib/utils";

const FIELD =
  "h-10 w-full rounded-[4px] border border-rule bg-white px-3 text-[14px] text-brand-950 outline-none focus:border-brand-950";

/**
 * The stall's own people, on its page. The owner edits the details and the
 * team; a team member is told what being on it lets them do.
 */
export function ManageStall({
  id,
  role,
  initial,
  team,
}: {
  id: string;
  role: "owner" | "member";
  initial: MyExhibitorInput;
  team: { email: string; role: "owner" | "member" }[];
}) {
  if (role === "member") {
    return (
      <section className="rounded-[4px] border border-rule bg-white p-4">
        <p className="text-[14px] font-semibold text-brand-950">You are on {initial.name}&apos;s team</p>
        <p className="mt-1 text-[13px] leading-5 text-brand-900/75">
          In Discuss, choose {initial.name} under Post as to post for the company.
        </p>
      </section>
    );
  }
  return <OwnerTools id={id} initial={initial} team={team} />;
}

function OwnerTools({
  id,
  initial,
  team,
}: {
  id: string;
  initial: MyExhibitorInput;
  team: { email: string; role: "owner" | "member" }[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<MyExhibitorInput>(initial);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [email, setEmail] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const set = (k: Exclude<keyof MyExhibitorInput, "social">, v: string) => setF((x) => ({ ...x, [k]: v }));
  const setSocial = (k: keyof MyExhibitorInput["social"], v: string) =>
    setF((x) => ({ ...x, social: { ...x.social, [k]: v } }));

  async function upload(file: File) {
    if (file.size > 3 * 1024 * 1024) {
      setNote({ ok: false, text: "Use a logo under 3 MB." });
      return;
    }
    setUploading(true);
    setNote(null);
    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${EVENT_STORAGE_PREFIX}/exhibitors/${id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("LOGOS")
      .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    setUploading(false);
    if (error) {
      setNote({ ok: false, text: "The logo did not upload. Try again." });
      return;
    }
    set("logo_url", supabase.storage.from("LOGOS").getPublicUrl(path).data.publicUrl);
  }

  function save() {
    setNote(null);
    startTransition(async () => {
      const res = await updateMyExhibitor(id, f);
      if ("error" in res) {
        setNote({ ok: false, text: res.error });
        return;
      }
      setNote({ ok: true, text: "Saved." });
      setOpen(false);
      router.refresh();
    });
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setNote(null);
    startTransition(async () => {
      const res = await addTeamMember(id, email);
      if ("error" in res) {
        setNote({ ok: false, text: res.error });
        return;
      }
      setEmail("");
      router.refresh();
    });
  }

  function remove(target: string) {
    setNote(null);
    startTransition(async () => {
      const res = await removeTeamMember(id, target);
      if ("error" in res) setNote({ ok: false, text: res.error });
      router.refresh();
    });
  }

  const members = team.filter((t) => t.role === "member");

  return (
    <section className="rounded-[4px] border border-rule bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] font-semibold text-brand-950">Manage your stall</p>
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-9 rounded-[4px] bg-brand-950 px-3.5 text-[13px] font-medium text-white"
          >
            Edit details
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="mt-3 space-y-2.5">
          <Labelled label="Company">
            <input value={f.name} onChange={(e) => set("name", e.target.value)} className={FIELD} />
          </Labelled>
          <Labelled label="One line about you">
            <input value={f.tagline} onChange={(e) => set("tagline", e.target.value)} className={FIELD} />
          </Labelled>
          <Labelled label="About">
            <textarea
              value={f.about}
              onChange={(e) => set("about", e.target.value)}
              rows={4}
              className="w-full rounded-md border border-rule bg-white px-3 py-2 text-[14px] text-brand-950 outline-none focus:border-brand-300"
            />
          </Labelled>
          <Labelled label="At the stall">
            <textarea
              value={f.showcase}
              onChange={(e) => set("showcase", e.target.value)}
              rows={3}
              placeholder="What visitors will see: products, demos, models"
              className="w-full rounded-[4px] border border-rule bg-white px-3 py-2 text-[14px] text-brand-950 outline-none focus:border-brand-950"
            />
          </Labelled>
          <div className="grid grid-cols-2 gap-2.5">
            <Labelled label="Website">
              <input
                value={f.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="company.com"
                className={FIELD}
              />
            </Labelled>
            <Labelled label="Based in">
              <input
                value={f.based_in}
                onChange={(e) => set("based_in", e.target.value)}
                placeholder="City"
                className={FIELD}
              />
            </Labelled>
          </div>
          {/* The pavilion (category) is the organisers' to set, so it is not here. */}
          <div className="grid grid-cols-2 gap-2.5">
            {(
              [
                ["linkedin", "LinkedIn"],
                ["x", "X"],
                ["instagram", "Instagram"],
                ["youtube", "YouTube"],
                ["facebook", "Facebook"],
              ] as const
            ).map(([k, label]) => (
              <Labelled key={k} label={label}>
                <input
                  value={f.social[k]}
                  onChange={(e) => setSocial(k, e.target.value)}
                  placeholder="Link to the page"
                  className={FIELD}
                />
              </Labelled>
            ))}
          </div>
          <Labelled label="Logo">
            <div className="flex items-center gap-3">
              <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-white ring-1 ring-rule">
                {f.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.logo_url} alt="" className="size-full object-contain p-1" />
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="h-9 rounded-md border border-rule bg-white px-3 text-[13px] text-brand-900 hover:bg-paper disabled:opacity-50"
              >
                {uploading ? "Uploading…" : f.logo_url ? "Change logo" : "Upload logo"}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file);
                  e.target.value = "";
                }}
              />
            </div>
          </Labelled>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={save}
              disabled={pending || uploading}
              className="h-10 rounded-md bg-brand-800 px-4 text-[13.5px] font-medium text-white hover:bg-brand-900 disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setF(initial);
                setOpen(false);
              }}
              className="h-10 rounded-md border border-rule bg-white px-4 text-[13.5px] text-brand-900"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 border-t border-[#DCE4F7] pt-3">
        <p className="text-[13px] font-semibold text-brand-950">Your team</p>
        <p className="mt-0.5 text-[12px] text-brand-900/65">
          They can post in Discuss as {initial.name}.
        </p>
        <form onSubmit={add} className="mt-2 flex gap-2">
          <input
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@company.com"
            aria-label="Team member's email"
            className={cn(FIELD, "min-w-0 flex-1")}
          />
          <button
            type="submit"
            disabled={pending || !email.trim()}
            className="h-10 shrink-0 rounded-md bg-brand-800 px-4 text-[13.5px] font-medium text-white disabled:opacity-50"
          >
            Add
          </button>
        </form>
        {members.length > 0 ? (
          <ul className="mt-2 divide-y divide-rule overflow-hidden rounded-md border border-rule bg-white">
            {members.map((m) => (
              <li key={m.email} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="truncate text-[13px] text-brand-950">{m.email}</span>
                <button
                  type="button"
                  onClick={() => remove(m.email)}
                  disabled={pending}
                  className="h-8 shrink-0 rounded-md px-2.5 text-[12.5px] text-iit-600 hover:bg-paper disabled:opacity-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {note ? (
        <p className={cn("mt-3 text-[12.5px]", note.ok ? "text-brand-800" : "text-iit-600")} role="status">
          {note.text}
        </p>
      ) : null}
    </section>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-brand-950">{label}</span>
      {children}
    </label>
  );
}
