"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { updateProfile, type UpdateProfileResult } from "@/app/actions/update-profile";
import { ChipMultiSelect } from "@/components/features/chip-multiselect";
import { ASKS, INTERESTS, OFFERS } from "@/lib/constants";

interface InitialProfile {
  full_name?: string | null;
  designation?: string | null;
  company?: string | null;
  iit_campus?: string | null;
  graduation_year?: number | null;
  branch?: string | null;
  bio?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  asks?: string[] | null;
  offers?: string[] | null;
  interests?: string[] | null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-10 rounded-md bg-brand-800 px-5 text-sm font-medium text-white transition-colors hover:bg-brand-900 disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save changes"}
    </button>
  );
}

function errorMessage(state: UpdateProfileResult | null): string | null {
  if (!state) return null;
  if ("ok" in state) return null;
  switch (state.error) {
    case "unauth":
      return "Your session has expired. Please sign in again.";
    case "invalid":
    case "db":
      return state.message;
    default:
      return null;
  }
}

export function EditProfileForm({ initial }: { initial: InitialProfile }) {
  const [state, action] = useActionState<UpdateProfileResult | null, FormData>(
    updateProfile,
    null
  );
  const message = errorMessage(state);

  return (
    <form action={action} className="space-y-5">
      <Field label="Full name" name="full_name" defaultValue={initial.full_name ?? ""} required />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Designation" name="designation" defaultValue={initial.designation ?? ""} />
        <Field label="Company" name="company" defaultValue={initial.company ?? ""} />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="IIT campus" name="iit_campus" defaultValue={initial.iit_campus ?? ""} />
        <Field
          label="Graduation year"
          name="graduation_year"
          inputMode="numeric"
          defaultValue={initial.graduation_year ? String(initial.graduation_year) : ""}
        />
      </div>
      <Field label="Branch" name="branch" defaultValue={initial.branch ?? ""} />
      <TextField label="Bio" name="bio" rows={4} defaultValue={initial.bio ?? ""} />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label="LinkedIn URL"
          name="linkedin_url"
          type="url"
          defaultValue={initial.linkedin_url ?? ""}
          placeholder="https://linkedin.com/in/..."
        />
        <Field
          label="Twitter / X URL"
          name="twitter_url"
          type="url"
          defaultValue={initial.twitter_url ?? ""}
          placeholder="https://x.com/..."
        />
      </div>

      <ChipMultiSelect
        name="interests"
        label="Areas of interest"
        helper="Tap any that apply. Used to highlight matching agenda sessions and connections."
        options={INTERESTS}
        initial={initial.interests ?? []}
      />
      <ChipMultiSelect
        name="asks"
        label="Looking for"
        helper="What you hope to find at the summit."
        options={ASKS}
        initial={initial.asks ?? []}
      />
      <ChipMultiSelect
        name="offers"
        label="Can offer"
        helper="What you can help other attendees with."
        options={OFFERS}
        initial={initial.offers ?? []}
      />

      {message ? (
        <p className="text-sm text-iit-500" role="alert">
          {message}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Link href="/me" className="text-sm font-medium text-brand-800 hover:text-brand-900">
          Cancel
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  inputMode,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  inputMode?: "text" | "numeric" | "email" | "tel" | "url";
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-brand-900">{label}</span>
      <input
        name={name}
        type={type}
        inputMode={inputMode}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-brand-100 bg-white px-3 text-sm text-brand-950 outline-none placeholder:text-brand-800/45 focus:border-brand-800 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}

function TextField({
  label,
  name,
  defaultValue,
  rows = 3,
  helper,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  helper?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-brand-900">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className="w-full rounded-md border border-brand-100 bg-white px-3 py-2 text-sm leading-6 text-brand-950 outline-none placeholder:text-brand-800/45 focus:border-brand-800 focus:ring-2 focus:ring-brand-100"
      />
      {helper ? <span className="mt-1 block text-[11px] text-brand-800/70">{helper}</span> : null}
    </label>
  );
}
