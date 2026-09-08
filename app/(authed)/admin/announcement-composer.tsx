"use client";

import { useState, useTransition } from "react";
import { Loader2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";

const PRIORITIES = [
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const;

type Priority = (typeof PRIORITIES)[number]["value"];

export function AnnouncementComposer() {
  const supabase = createClient();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("announcements").insert({
        title: title.trim(),
        body: body.trim() || null,
        priority,
        created_by: user.id,
      });
      if (error) {
        toast({ title: "Could not send", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Announcement sent" });
      setTitle("");
      setBody("");
      setPriority("normal");
    });
  }

  return (
    <div id="announce" className="rounded-lg border border-slate-200 bg-white p-4 scroll-mt-20">
      <div className="mb-3 flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-brand-800" />
        <h2 className="text-sm font-semibold text-brand-900">Send an announcement</h2>
      </div>
      <div className="space-y-3">
        <div>
          <Label htmlFor="ann-title" className="text-xs font-medium text-slate-700">
            Title
          </Label>
          <Input
            id="ann-title"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 120))}
            placeholder="Lunch is now open in the Sponsor Plaza"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="ann-body" className="text-xs font-medium text-slate-700">
            Body
          </Label>
          <Textarea
            id="ann-body"
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 1000))}
            placeholder="Optional. Up to 1,000 characters."
            rows={3}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs font-medium text-slate-700">Priority</Label>
          <div className="mt-1 inline-flex rounded-md border border-slate-300 bg-white p-1">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  priority === p.value
                    ? p.value === "urgent"
                      ? "bg-iit-500 text-white"
                      : "bg-brand-800 text-white"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={pending || !title.trim()}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
