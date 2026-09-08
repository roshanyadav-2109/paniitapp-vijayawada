"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { IIT_CAMPUSES } from "@/lib/constants";
import {
  completeOnboarding,
  type OnboardingResult,
} from "@/app/actions/complete-onboarding";

export interface OnboardingInitial {
  full_name: string;
  designation: string;
  company: string;
  iit_campus: string;
  graduation_year: number | null;
  branch: string;
  bio: string;
  linkedin_url: string;
  twitter_url: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 w-full rounded-md bg-brand-800 px-5 text-[13px] font-semibold tracking-tight text-white transition-colors hover:bg-brand-900 disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save & continue"}
    </button>
  );
}

function errorMessage(state: OnboardingResult | null): string | null {
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

export function OnboardingForm({
  initial,
  next,
}: {
  initial: OnboardingInitial;
  next: string;
}) {
  const [state, action] = useActionState<OnboardingResult | null, FormData>(
    completeOnboarding,
    null
  );
  const message = errorMessage(state);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <Field
        label="Full name"
        name="full_name"
        defaultValue={initial.full_name}
        required
      />
      <Field
        label="Designation"
        name="designation"
        defaultValue={initial.designation}
        required
        placeholder="e.g. Founder, Partner, Research Scientist"
      />
      <Field
        label="Organisation"
        name="company"
        defaultValue={initial.company}
        required
        placeholder="Company / institute / fund"
      />

      <div>
        <Label>IIT campus</Label>
        <select
          name="iit_campus"
          defaultValue={initial.iit_campus}
          className="h-11 w-full rounded-md border border-brand-100 bg-white px-3 text-sm text-brand-950 outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-100"
        >
          <option value="">Skip for now</option>
          {IIT_CAMPUSES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="Branch"
          name="branch"
          defaultValue={initial.branch}
          placeholder="e.g. Computer Science"
        />
        <Field
          label="Graduation year"
          name="graduation_year"
          inputMode="numeric"
          defaultValue={
            initial.graduation_year ? String(initial.graduation_year) : ""
          }
          placeholder="2018"
        />
      </div>

      <div>
        <Label>Bio</Label>
        <textarea
          name="bio"
          rows={4}
          defaultValue={initial.bio}
          placeholder="A couple of sentences on what you're building or working on."
          className="w-full rounded-md border border-brand-100 bg-white px-3 py-2 text-sm leading-6 text-brand-950 outline-none placeholder:text-brand-800/45 focus:border-brand-800 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          label="LinkedIn URL"
          name="linkedin_url"
          type="url"
          defaultValue={initial.linkedin_url}
          placeholder="https://linkedin.com/in/..."
        />
        <Field
          label="Twitter / X URL"
          name="twitter_url"
          type="url"
          defaultValue={initial.twitter_url}
          placeholder="https://x.com/..."
        />
      </div>

      {message ? (
        <p
          role="alert"
          className="rounded-md border border-iit-200 bg-iit-50 px-3 py-2 text-sm text-iit-700"
        >
          {message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <span className="mb-1.5 block text-xs font-medium text-brand-900">
      {children}
      {required ? <span className="ml-0.5 text-iit-500">*</span> : null}
    </span>
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
      <Label required={required}>{label}</Label>
      <input
        name={name}
        type={type}
        inputMode={inputMode}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-brand-100 bg-white px-3 text-sm text-brand-950 outline-none placeholder:text-brand-800/45 focus:border-brand-800 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}
