"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { addComment, createPost, votePoll } from "@/app/actions/discussion";
import { sendMessage } from "@/app/actions/send-message";
import { toast } from "@/hooks/use-toast";

/**
 * What people do in the hall, held until there is signal to send it.
 *
 * Inside the venue a question, a vote or a scanned badge would otherwise
 * fail with "try again" until the person gives up. Instead the call site
 * hands it to `queue`, it is kept in this phone's storage, and
 * <OutboxFlusher> sends it the moment the network is back: on the browser's
 * "online" event, on return to the app, and every 30 seconds while
 * anything is waiting. Kept per signed-in person, so a job never goes out
 * under someone else's name.
 */

export type OutboxJob =
  | { kind: "question"; sessionId: string; question: string }
  | { kind: "post"; body: string; options?: string[]; sessionId?: string }
  | { kind: "comment"; postId: string; body: string }
  | { kind: "vote"; postId: string; optionId: string }
  | { kind: "message"; recipientId: string; body: string }
  | { kind: "connect"; qrToken: string };

type Stored = OutboxJob & { id: string; userId: string; at: number; tries: number };

const KEY = "outbox-v1";
const MAX_TRIES = 8;
const EVENT = "outbox:changed";

function load(): Stored[] {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as Stored[];
  } catch {
    return [];
  }
}

function save(jobs: Stored[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(jobs));
  } catch {
    /* storage full or blocked; the job is lost, as it would have been */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** True when a failed call failed for want of a network, not on its merits. */
export function isNetworkFailure(err: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  const msg = err instanceof Error ? err.message : typeof err === "string" ? err : JSON.stringify(err ?? "");
  return /failed to fetch|networkerror|load failed|network request failed|fetch failed|timeout/i.test(msg);
}

export function isOffline() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

/** Keeps the job for later. Returns false when nobody is signed in on this
 *  phone, in which case there is nobody to send it as. */
export async function queue(job: OutboxJob): Promise<boolean> {
  // getSession reads the phone's own copy of the login; no network.
  const { data } = await createClient().auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return false;
  const jobs = load();
  jobs.push({ ...job, id: crypto.randomUUID(), userId, at: Date.now(), tries: 0 });
  save(jobs);
  toast({
    title: "Saved on your phone",
    description: "No signal right now. It will send by itself when you're back online.",
  });
  return true;
}

/**
 * Runs `send`; if it fails for want of a network (or there is none to
 * begin with), keeps `job` for later instead. Resolves to the call's own
 * result, or to "queued".
 */
export async function sendOrQueue<T>(job: OutboxJob, send: () => Promise<T>): Promise<T | "queued"> {
  if (isOffline() && (await queue(job))) return "queued";
  try {
    return await send();
  } catch (err) {
    if (isNetworkFailure(err) && (await queue(job))) return "queued";
    throw err;
  }
}

async function run(job: Stored): Promise<"done" | "retry" | "drop"> {
  const supabase = createClient();
  try {
    switch (job.kind) {
      case "question": {
        const { error } = await supabase
          .from("session_questions")
          .insert({ session_id: job.sessionId, user_id: job.userId, question: job.question });
        if (error) return isNetworkFailure(error.message) ? "retry" : "drop";
        return "done";
      }
      case "post": {
        const r = await createPost(job.body, job.options, undefined, job.sessionId);
        return "error" in r ? "drop" : "done";
      }
      case "comment": {
        const r = await addComment(job.postId, job.body);
        return "error" in r ? "drop" : "done";
      }
      case "vote": {
        const r = await votePoll(job.postId, job.optionId);
        return "error" in r ? "drop" : "done";
      }
      case "message": {
        const r = await sendMessage({ recipient_id: job.recipientId, body: job.body });
        return r && "error" in r && r.error ? "drop" : "done";
      }
      case "connect": {
        const { data: target, error } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("qr_token", job.qrToken)
          .maybeSingle();
        if (error) return isNetworkFailure(error.message) ? "retry" : "drop";
        if (!target || target.id === job.userId) return "drop";
        const a = job.userId < target.id ? job.userId : target.id;
        const b = job.userId < target.id ? target.id : job.userId;
        const { error: e2 } = await supabase
          .from("connections")
          .upsert({ user_a: a, user_b: b }, { onConflict: "user_a,user_b" });
        if (e2) return isNetworkFailure(e2.message) ? "retry" : "drop";
        toast({ title: `Connected with ${target.full_name ?? "attendee"}` });
        return "done";
      }
    }
  } catch (err) {
    return isNetworkFailure(err) ? "retry" : "drop";
  }
}

let flushing = false;

async function flush(userId: string | null) {
  if (flushing || !userId || isOffline()) return;
  flushing = true;
  try {
    let sent = 0;
    for (const job of load()) {
      if (job.userId !== userId) continue;
      const outcome = await run(job);
      // Re-read each time: a new job may have been queued meanwhile.
      const now = load();
      if (outcome === "retry") {
        const kept = now.map((j) => (j.id === job.id ? { ...j, tries: j.tries + 1 } : j));
        save(kept.filter((j) => j.tries < MAX_TRIES));
        break; // still no network; try the rest later
      }
      save(now.filter((j) => j.id !== job.id));
      if (outcome === "done") sent += 1;
    }
    if (sent > 0) {
      toast({ title: sent === 1 ? "Sent what you saved offline" : `Sent ${sent} things you saved offline` });
    }
  } finally {
    flushing = false;
  }
}

export function OutboxFlusher({ userId }: { userId: string | null }) {
  useEffect(() => {
    const go = () => void flush(userId);
    go();
    const onVisible = () => {
      if (document.visibilityState === "visible") go();
    };
    window.addEventListener("online", go);
    window.addEventListener(EVENT, go);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(() => {
      if (load().some((j) => j.userId === userId)) go();
    }, 30000);
    return () => {
      window.removeEventListener("online", go);
      window.removeEventListener(EVENT, go);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [userId]);

  return null;
}
