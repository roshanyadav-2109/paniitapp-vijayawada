"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { deleteExhibitor, saveExhibitor, type ExhibitorInput } from "@/app/actions/admin";
import { createClient } from "@/lib/supabase/client";
import { EVENT_STORAGE_PREFIX } from "@/lib/event-config";

export interface AdminStall {
  id: string;
  name: string;
  booth_number: string | null;
  category: string | null;
  tagline: string | null;
  about: string | null;
  website: string | null;
  logo_url: string | null;
  is_published: boolean | null;
  /** Signed in with this email, they edit the stall and add their team. */
  owner_email?: string | null;
}

const FIELD =
  "h-10 w-full rounded-md border border-rule bg-white px-3 text-[14px] text-brand-950 outline-none focus:border-brand-300";
const BUTTON = "h-10 rounded-md px-4 text-[13.5px] transition-colors disabled:opacity-50";

function toInput(s?: AdminStall): ExhibitorInput {
  return {
    id: s?.id,
    name: s?.name ?? "",
    booth_number: s?.booth_number ?? "",
    category: s?.category ?? "",
    tagline: s?.tagline ?? "",
    about: s?.about ?? "",
    website: s?.website ?? "",
    logo_url: s?.logo_url ?? "",
    is_published: s ? !!s.is_published : true,
    owner_email: s?.owner_email ?? "",
  };
}

export function ExpoAdmin({ stalls }: { stalls: AdminStall[] }) {
  const [adding, setAdding] = useState(false);
  const shown = stalls.filter((s) => s.is_published).length;

  return (
    <div className="mt-5 space-y-3">
      {adding ? (
        <StallEditor onDone={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className={`${BUTTON} w-full bg-brand-800 font-medium text-white hover:bg-brand-900`}
        >
          Add a stall
        </button>
      )}
      <p className="text-[12px] text-brand-900/55">
        {stalls.length} stall{stalls.length === 1 ? "" : "s"} · {shown} showing on the Expo page
      </p>
      <ul className="space-y-2">
        {stalls.map((s) => (
          <StallRow key={s.id} s={s} />
        ))}
      </ul>
    </div>
  );
}

function StallRow({ s }: { s: AdminStall }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (editing) return <StallEditor s={s} onDone={() => setEditing(false)} />;

  function run(fn: () => Promise<{ ok: true } | { error: string }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if ("error" in r) setError(r.error);
      else router.refresh();
    });
  }

  return (
    <li className="rounded-lg border border-rule bg-white p-3.5">
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md border border-rule bg-white">
          {s.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.logo_url} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[11px] text-brand-900/40">No logo</span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-brand-950">{s.name}</span>
          <span className="block truncate text-[12px] text-brand-900/60">
            {[s.booth_number ? `Stall ${s.booth_number}` : "No stall number", s.category]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        <span
          className={
            s.is_published
              ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[11.5px] font-medium text-emerald-700"
              : "rounded-full bg-paper px-2 py-0.5 text-[11.5px] text-brand-900/60"
          }
        >
          {s.is_published ? "Showing" : "Hidden"}
        </span>
      </div>
      {error ? <p className="mt-2 text-[12.5px] text-iit-600">{error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2 border-t border-rule pt-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`${BUTTON} border border-rule bg-white text-brand-900 hover:bg-paper`}
        >
          Edit
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => saveExhibitor({ ...toInput(s), is_published: !s.is_published }))}
          className={`${BUTTON} border border-rule bg-white text-brand-900 hover:bg-paper`}
        >
          {s.is_published ? "Hide" : "Show"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Delete ${s.name}'s stall? Its team list goes with it.`))
              run(() => deleteExhibitor(s.id));
          }}
          className={`${BUTTON} border border-iit-200 bg-white text-iit-700 hover:bg-iit-50`}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

function StallEditor({ s, onDone }: { s?: AdminStall; onDone: () => void }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [f, setF] = useState<ExhibitorInput>(toInput(s));
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof ExhibitorInput>(k: K, v: ExhibitorInput[K]) => setF((x) => ({ ...x, [k]: v }));

  async function upload(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("A logo has to be an image.");
      return;
    }
    setUploading(true);
    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${EVENT_STORAGE_PREFIX}/exhibitors/${crypto.randomUUID()}.${ext}`;
    const { error: err } = await supabase.storage
      .from("LOGOS")
      .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    setUploading(false);
    if (err) {
      setError(`Could not upload the logo: ${err.message}`);
      return;
    }
    set("logo_url", supabase.storage.from("LOGOS").getPublicUrl(path).data.publicUrl);
  }

  return (
    <form
      className="space-y-3 rounded-lg border border-brand-300 bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await saveExhibitor(f);
          if ("error" in r) setError(r.error);
          else {
            router.refresh();
            onDone();
          }
        });
      }}
    >
      <p className="text-[14px] font-medium text-brand-950">{s ? "Edit stall" : "New stall"}</p>
      <Labelled label="Company">
        <input value={f.name} onChange={(e) => set("name", e.target.value)} className={FIELD} required />
      </Labelled>
      <div className="grid grid-cols-2 gap-2">
        <Labelled label="Stall number">
          <input
            value={f.booth_number}
            onChange={(e) => set("booth_number", e.target.value)}
            placeholder="e.g. EX-S14"
            className={FIELD}
          />
        </Labelled>
        <Labelled label="Category">
          <input
            value={f.category}
            onChange={(e) => set("category", e.target.value)}
            placeholder="e.g. Deeptech"
            className={FIELD}
          />
        </Labelled>
      </div>
      <Labelled label="One line about them">
        <input value={f.tagline} onChange={(e) => set("tagline", e.target.value)} className={FIELD} />
      </Labelled>
      <Labelled label="About (optional)">
        <textarea
          value={f.about}
          onChange={(e) => set("about", e.target.value)}
          rows={3}
          className="w-full rounded-md border border-rule bg-white px-3 py-2 text-[14px] text-brand-950 outline-none focus:border-brand-300"
        />
      </Labelled>
      <Labelled label="Owner email (they can edit this stall and add their team)">
        <input
          type="email"
          inputMode="email"
          value={f.owner_email}
          onChange={(e) => set("owner_email", e.target.value)}
          placeholder="founder@company.com"
          className={FIELD}
        />
      </Labelled>
      <Labelled label="Website">
        <input
          value={f.website}
          onChange={(e) => set("website", e.target.value)}
          placeholder="company.com"
          className={FIELD}
        />
      </Labelled>
      <Labelled label="Logo">
        <div className="flex items-center gap-3">
          <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-md border border-rule bg-white">
            {f.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.logo_url} alt="" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-[11px] text-brand-900/40">None</span>
            )}
          </span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className={`${BUTTON} border border-rule bg-white text-brand-900 hover:bg-paper`}
          >
            {uploading ? "Uploading…" : f.logo_url ? "Replace" : "Upload"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void upload(file);
            }}
          />
        </div>
        <input
          value={f.logo_url}
          onChange={(e) => set("logo_url", e.target.value)}
          placeholder="or paste a link to the logo"
          className={`${FIELD} mt-2`}
        />
      </Labelled>
      <label className="flex items-center gap-2 text-[13px] text-brand-900">
        <input
          type="checkbox"
          checked={f.is_published}
          onChange={(e) => set("is_published", e.target.checked)}
          className="size-4 accent-brand-800"
        />
        Show on the Expo page
      </label>
      {error ? <p className="text-[12.5px] text-iit-600">{error}</p> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || uploading}
          className={`${BUTTON} bg-brand-800 font-medium text-white hover:bg-brand-900`}
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onDone} className={`${BUTTON} border border-rule bg-white text-brand-900`}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-medium text-brand-900/60">{label}</span>
      {children}
    </label>
  );
}
