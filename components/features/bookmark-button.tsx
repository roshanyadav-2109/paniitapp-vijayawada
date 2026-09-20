"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  sessionId: string;
  initial: boolean;
  size?: "sm" | "md";
  withLabel?: boolean;
}

export function BookmarkButton({ sessionId, initial, size = "sm", withLabel }: Props) {
  const [bookmarked, setBookmarked] = useState(initial);
  const [pending, startTransition] = useTransition();
  const supabase = createClient();

  function toggle(e?: React.MouseEvent | React.PointerEvent) {
    e?.preventDefault();
    e?.stopPropagation();
    const next = !bookmarked;
    setBookmarked(next);
    startTransition(async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setBookmarked(!next);
        return;
      }
      if (next) {
        const { error } = await supabase
          .from("session_bookmarks")
          .upsert({ user_id: user.id, session_id: sessionId });
        if (error) setBookmarked(!next);
      } else {
        const { error } = await supabase
          .from("session_bookmarks")
          .delete()
          .eq("user_id", user.id)
          .eq("session_id", sessionId);
        if (error) setBookmarked(!next);
      }
    });
  }

  const Icon = bookmarked ? BookmarkCheck : Bookmark;
  const iconSize = size === "md" ? "h-5 w-5" : "h-4 w-4";

  if (withLabel) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={bookmarked}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
          bookmarked
            ? "border-brand-800 bg-paper-deep text-brand-800"
            : "border-rule-strong bg-white text-brand-900/80 hover:bg-paper"
        )}
      >
        <Icon className={iconSize} />
        {bookmarked ? "Bookmarked" : "Bookmark"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark session"}
      className={cn(
        "inline-grid h-8 w-8 place-items-center rounded-md transition-colors",
        bookmarked
          ? "text-brand-800 hover:bg-paper-deep"
          : "text-brand-900/45 hover:bg-paper-deep hover:text-brand-900/80"
      )}
    >
      <Icon className={iconSize} />
    </button>
  );
}
