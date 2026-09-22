"use client";

import { EmptyArt } from "@/components/features/empty-art";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  BadgeCheck,
  Camera,
  Check,
  Loader2,
  Reply,
  Send,
  SlidersHorizontal,
  Trash2,
  X,
} from "@/components/icons";
import {
  MEDIA_ACCEPT,
  cloudinaryConfigured,
  uploadToCloudinary,
  type UploadedMedia,
} from "@/lib/cloudinary";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { dayIST, timeIST } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import { cn, initials } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  addComment,
  createPost,
  deletePost,
  toggleLike,
  votePoll,
} from "@/app/actions/discussion";

export interface PostAuthor {
  id: string;
  full_name: string | null;
  designation: string | null;
  company: string | null;
  photo_url: string | null;
  role: string | null;
}

export interface PollOption {
  id: string;
  label: string;
  position: number;
  vote_count: number;
}

export interface PostRow {
  id: string;
  body: string;
  kind: "text" | "poll";
  /** Cloudinary URL of an attached photo or clip, and which it is. */
  media_url: string | null;
  media_type: "image" | "video" | null;
  like_count: number;
  comment_count: number;
  vote_count: number;
  is_pinned: boolean;
  created_at: string;
  author_id: string;
  // PostgREST returns an embedded row; it can be an array shape depending on
  // the relationship it infers, so normalise before use.
  author: PostAuthor | PostAuthor[] | null;
  poll_options: PollOption[] | null;
}

interface CommentRow {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles: { full_name: string | null; photo_url: string | null } | null;
}

const MAX_BODY = 2000;

function author(p: PostRow): PostAuthor | null {
  if (!p.author) return null;
  return Array.isArray(p.author) ? p.author[0] ?? null : p.author;
}

/**
 * Date and time for the line under a post's author.
 *
 * On its own line there is room for the actual moment rather than "3h", and
 * on a feed that spans the weeks before a summit "3h" and "9d" stop being
 * comparable to each other anyway. Times are the summit's own zone, which is
 * the one everybody in the room is on.
 */
function postedAt(iso: string): string {
  return `${dayIST(iso)} | ${timeIST(iso)}`;
}

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function DiscussClient({
  posts,
  likedIds,
  myVotes,
  userId,
  errored,
}: {
  posts: PostRow[];
  likedIds: string[];
  myVotes: Record<string, string>;
  userId: string | null;
  errored: boolean;
}) {
  const liked = useMemo(() => new Set(likedIds), [likedIds]);

  return (
    <div className="space-y-4">
      <Composer />

      {errored ? (
        <p className="rounded-lg border border-iit-200 bg-iit-50 p-3 text-[13px] text-iit-700">
          Couldn&apos;t load the discussion. Pull to refresh.
        </p>
      ) : null}

      {posts.length === 0 && !errored ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia className="mb-1">
              <EmptyArt name="empty-discussion" />
            </EmptyMedia>
            <EmptyTitle>Nothing here yet</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              liked={liked.has(p.id)}
              myVote={myVotes[p.id] ?? null}
              userId={userId}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Composer                                                            */
/* ------------------------------------------------------------------ */

function Composer() {
  const router = useRouter();
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const [isPoll, setIsPoll] = useState(false);
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [pending, startTransition] = useTransition();
  const [media, setMedia] = useState<UploadedMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const canAttach = cloudinaryConfigured();

  const canSubmit =
    body.trim().length > 0 &&
    !uploading &&
    (!isPoll || options.filter((o) => o.trim()).length >= 2);

  async function attach(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      setMedia(await uploadToCloudinary(file));
    } catch (err) {
      toast({
        title: "Could not attach that",
        description: err instanceof Error ? err.message : "Upload failed.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Clear the input, or picking the same file twice does nothing.
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function submit() {
    if (!canSubmit || pending) return;
    startTransition(async () => {
      const res = await createPost(
        body,
        isPoll ? options : undefined,
        media ?? undefined
      );
      if ("error" in res) {
        toast({ title: "Could not post", description: res.error, variant: "destructive" });
        return;
      }
      setBody("");
      setOptions(["", ""]);
      setIsPoll(false);
      setMedia(null);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-rule bg-white p-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
        rows={isPoll ? 2 : 3}
        placeholder="Share something with the room…"
        className="w-full resize-none rounded-md border border-rule bg-white px-3 py-2 text-[14px] leading-6 text-brand-950 outline-none placeholder:text-brand-900/40 focus:border-brand-300"
      />

      {isPoll ? (
        <div className="mt-2 space-y-2">
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={o}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = e.target.value.slice(0, 120);
                  setOptions(next);
                }}
                placeholder={`Option ${i + 1}`}
                className="h-9 w-full min-w-0 flex-1 rounded-md border border-rule px-3 text-[13px] text-brand-950 outline-none placeholder:text-brand-900/40 focus:border-brand-300"
              />
              {options.length > 2 ? (
                <button
                  type="button"
                  aria-label={`Remove option ${i + 1}`}
                  onClick={() => setOptions(options.filter((_, j) => j !== i))}
                  className="grid size-8 shrink-0 place-items-center rounded-md text-brand-800/60 hover:bg-paper-deep"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          ))}
          {options.length < 4 ? (
            <button
              type="button"
              onClick={() => setOptions([...options, ""])}
              className="text-[12px] font-medium text-brand-800 hover:text-brand-900"
            >
              + Add option
            </button>
          ) : null}
        </div>
      ) : null}

      {/* The attachment, square like everything else that frames a picture
          in this app. A clip gets the same square and its own controls. */}
      {media ? (
        <div className="relative mt-2.5 w-[132px]">
          {media.type === "video" ? (
            <video
              src={media.url}
              controls
              playsInline
              className="aspect-square w-full rounded-md bg-black object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.url}
              alt=""
              className="aspect-square w-full rounded-md object-cover"
            />
          )}
          <button
            type="button"
            onClick={() => setMedia(null)}
            aria-label="Remove attachment"
            className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-brand-950 text-white shadow-sm"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      <div className="mt-2.5 flex items-center justify-between">
        <input
          ref={fileRef}
          type="file"
          accept={MEDIA_ACCEPT}
          className="hidden"
          onChange={(e) => attach(e.target.files?.[0])}
        />
        {canAttach ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || !!media}
            className="mr-2 inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-brand-800 transition-colors hover:bg-paper-deep disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Camera className="size-3.5" strokeWidth={1.8} />
            )}
            {uploading ? "Uploading" : "Photo or clip"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setIsPoll((v) => !v)}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-colors",
            isPoll
              ? "bg-brand-800 text-white"
              : "text-brand-800 hover:bg-paper-deep"
          )}
        >
          <SlidersHorizontal className="size-3.5" strokeWidth={1.8} />
          {isPoll ? "Poll" : "Add poll"}
        </button>
        <Button size="sm" onClick={submit} disabled={!canSubmit || pending}>
          {/* The word alone. A paper-plane beside "Post" says nothing the
              word does not, on the one button whose label is unambiguous. */}
          {pending ? <Loader2 className="size-4 animate-spin" /> : "Post"}
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Post                                                                */
/* ------------------------------------------------------------------ */

function PostCard({
  post,
  liked,
  myVote,
  userId,
}: {
  post: PostRow;
  liked: boolean;
  myVote: string | null;
  userId: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [showComments, setShowComments] = useState(false);
  const a = author(post);
  const isMine = userId != null && post.author_id === userId;

  // Optimistic like — the round trip is long enough to feel broken otherwise.
  const [likeOn, setLikeOn] = useState(liked);
  const [likeCount, setLikeCount] = useState(post.like_count);
  useEffect(() => {
    setLikeOn(liked);
    setLikeCount(post.like_count);
  }, [liked, post.like_count]);

  function onLike() {
    setLikeOn((v) => !v);
    setLikeCount((c) => c + (likeOn ? -1 : 1));
    startTransition(async () => {
      const res = await toggleLike(post.id);
      if ("error" in res) {
        setLikeOn(liked);
        setLikeCount(post.like_count);
        return;
      }
      router.refresh();
    });
  }

  function onDelete() {
    startTransition(async () => {
      const res = await deletePost(post.id);
      if ("error" in res) {
        toast({ title: "Could not delete", description: res.error, variant: "destructive" });
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="rounded-lg border border-rule bg-white p-3.5">
      <div className="flex items-start gap-2.5">
        <Link href={`/attendees/${post.author_id}`} className="shrink-0">
          {/* Square, as on the networking cards: at this size a circle crops
              the top of a head off every portrait. */}
          <Avatar className="size-9 rounded-md ring-1 ring-rule">
            {a?.photo_url ? (
              <AvatarImage
                src={a.photo_url}
                alt={a.full_name ?? ""}
                className="rounded-md"
              />
            ) : null}
            <AvatarFallback className="rounded-md bg-paper-deep text-[11px] font-semibold text-brand-800">
              {initials(a?.full_name ?? null)}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              href={`/attendees/${post.author_id}`}
              className="truncate text-[13px] font-semibold text-brand-950 hover:underline"
            >
              {a?.full_name ?? "Attendee"}
            </Link>
            {a?.role === "organizer" || a?.role === "admin" ? (
              <BadgeCheck className="size-3.5 shrink-0 text-brand-800" strokeWidth={1.8} />
            ) : null}
            {post.is_pinned ? (
              <span className="ml-auto shrink-0 rounded-full bg-paper-deep px-2 py-0.5 text-[10px] font-semibold text-brand-800">
                Pinned
              </span>
            ) : null}
          </div>
          {a?.designation || a?.company ? (
            <p className="truncate text-[11px] text-brand-950">
              {[a?.designation, a?.company].filter(Boolean).join(" | ")}
            </p>
          ) : null}
        </div>
        {isMine ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            aria-label="Delete post"
            className="grid size-7 shrink-0 place-items-center rounded-md text-brand-800/45 hover:bg-paper-deep hover:text-iit-500"
          >
            <Trash2 className="size-3.5" strokeWidth={1.7} />
          </button>
        ) : null}
      </div>

      <p className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-brand-950">
        {post.body}
      </p>

      {/* Attachment in a square, capped so one photo cannot take the whole
          screen. A clip carries controls and no autoplay — a feed that starts
          playing at you is a feed people leave. */}
      {post.media_url ? (
        <div className="mt-2.5 max-w-[280px]">
          {post.media_type === "video" ? (
            <video
              src={post.media_url}
              controls
              playsInline
              preload="metadata"
              className="aspect-square w-full rounded-md bg-black object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.media_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="aspect-square w-full rounded-md object-cover"
            />
          )}
        </div>
      ) : null}

      {post.kind === "poll" && post.poll_options ? (
        <Poll post={post} myVote={myVote} />
      ) : null}

      <div className="mt-2.5 flex items-center gap-1">
        <button
          type="button"
          onClick={onLike}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors",
            likeOn ? "text-brand-800" : "text-brand-900/55 hover:bg-paper-deep"
          )}
        >
          <Check className={cn("size-4", likeOn && "text-brand-800")} strokeWidth={1.9} />
          {likeCount > 0 ? likeCount : "Agree"}
        </button>
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium text-brand-900/55 transition-colors hover:bg-paper-deep"
        >
          <Reply className="size-4" strokeWidth={1.8} />
          {post.comment_count > 0 ? post.comment_count : "Reply"}
        </button>

        {/* Posted-at in the bottom corner, opposite the two things you can
            do with a post. It is the least urgent thing on the card, and up
            beside the name it was taking width from it. */}
        <span className="ml-auto shrink-0 pr-1 text-[11px] text-brand-950/70">
          {postedAt(post.created_at)}
        </span>
      </div>

      {showComments ? <Comments postId={post.id} /> : null}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Poll                                                                */
/* ------------------------------------------------------------------ */

function Poll({ post, myVote }: { post: PostRow; myVote: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [voted, setVoted] = useState<string | null>(myVote);
  useEffect(() => setVoted(myVote), [myVote]);

  const options = [...(post.poll_options ?? [])].sort((a, b) => a.position - b.position);
  const total = options.reduce((n, o) => n + o.vote_count, 0);

  function cast(optionId: string) {
    if (pending || voted === optionId) return;
    setVoted(optionId);
    startTransition(async () => {
      const res = await votePoll(post.id, optionId);
      if ("error" in res) setVoted(myVote);
      router.refresh();
    });
  }

  return (
    <div className="mt-2.5 space-y-1.5">
      {options.map((o) => {
        const pct = total > 0 ? Math.round((o.vote_count / total) * 100) : 0;
        const mine = voted === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => cast(o.id)}
            disabled={pending}
            className={cn(
              "relative w-full overflow-hidden rounded-md border px-3 py-2 text-left text-[13px] transition-colors",
              mine
                ? "border-brand-300 bg-paper-deep/40 font-semibold text-brand-900"
                : "border-rule text-brand-950 hover:bg-paper-deep/40"
            )}
          >
            {/* Result bar only appears once the viewer has voted, so early
                votes don't anchor everyone else's answer. */}
            {voted ? (
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 bg-rule/70"
                style={{ width: `${pct}%` }}
              />
            ) : null}
            <span className="relative flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                {mine ? <Check className="size-3.5 shrink-0" strokeWidth={2.2} /> : null}
                {o.label}
              </span>
              {voted ? (
                <span className="shrink-0 tabular-nums text-brand-900/70">{pct}%</span>
              ) : null}
            </span>
          </button>
        );
      })}
      <p className="pt-0.5 text-[11px] text-brand-900/50">
        {total === 0
          ? "No votes yet"
          : `${total} vote${total === 1 ? "" : "s"}${voted ? "" : " | tap to vote"}`}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Comments — fetched on demand, not with the feed                      */
/* ------------------------------------------------------------------ */

function Comments({ postId }: { postId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<CommentRow[] | null>(null);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("post_comments")
      .select("id, body, created_at, user_id, profiles:user_id(full_name, photo_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    return (data as unknown as CommentRow[] | null) ?? [];
  }, [postId, supabase]);

  // Open replies are a conversation, so they follow the post's comments as
  // they are written rather than waiting for the next thing you do. The
  // whole list is re-read instead of the new row being appended: a comment
  // arrives without its author's name attached, and this is a handful of
  // rows.
  useEffect(() => {
    let cancelled = false;
    load().then((r) => {
      if (!cancelled) setRows(r);
    });

    const ch = supabase
      .channel(`post-comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_comments",
          filter: `post_id=eq.${postId}`,
        },
        () => {
          load().then((r) => {
            if (!cancelled) setRows(r);
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [postId, supabase, load]);

  function submit() {
    const text = body.trim();
    if (!text || pending) return;
    startTransition(async () => {
      const res = await addComment(postId, text);
      if ("error" in res) return;
      setBody("");
      setRows(await load());
      router.refresh();
      inputRef.current?.focus();
    });
  }

  return (
    <div className="mt-2.5 pt-2.5">
      {rows === null ? (
        <div className="flex justify-center py-2">
          <Loader2 className="size-4 animate-spin text-brand-800/40" />
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => {
            const prof = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
            return (
              <li key={c.id} className="flex items-start gap-2">
                <Avatar className="size-6 shrink-0 ring-1 ring-rule">
                  {prof?.photo_url ? (
                    <AvatarImage src={prof.photo_url} alt={prof.full_name ?? ""} />
                  ) : null}
                  <AvatarFallback className="bg-paper-deep text-[9px] font-semibold text-brand-800">
                    {initials(prof?.full_name ?? null)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <span className="text-[12px] font-semibold text-brand-950">
                    {prof?.full_name ?? "Attendee"}
                  </span>
                  <span className="ml-1.5 text-[10px] text-brand-900/45">
                    {timeAgo(c.created_at)}
                  </span>
                  <p className="text-[13px] leading-5 text-brand-900">{c.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-2 flex items-center gap-2">
        <input
          ref={inputRef}
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 1000))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Add a reply…"
          // min-w-0: a flex item will not shrink below its intrinsic width
          // without it, and an input's is about twenty characters — so the
          // row grew wider than the card and pushed the send button off the
          // edge. More noticeable since inputs went to 16px on phones.
          className="h-9 w-full min-w-0 flex-1 rounded-md border border-rule px-3 text-[13px] text-brand-950 outline-none placeholder:text-brand-900/40 focus:border-brand-300"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!body.trim() || pending}
          aria-label="Send reply"
          className="grid size-9 shrink-0 place-items-center rounded-md bg-brand-800 text-white disabled:opacity-40"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" strokeWidth={1.8} />
          )}
        </button>
      </div>
    </div>
  );
}
