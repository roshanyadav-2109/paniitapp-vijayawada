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
  IMAGE_ACCEPT,
  VIDEO_ACCEPT,
  cloudinaryConfigured,
  deliverUrl,
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
import { sendOrQueue } from "@/components/features/outbox";
import { ReactionBar, useReactions, type Reactions } from "./reactions";
import { usePostViews, viewsLabel } from "./post-views";
import {
  addComment,
  createPost,
  deleteComment,
  deletePost,
  votePoll,
} from "@/app/actions/discussion";
import { Share2 } from "lucide-react";

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
  /** Posted by an admin under the summit team's name. */
  as_team?: boolean | null;
  /** Posted as an exhibitor: the company shows, and links to its page. */
  as_exhibitor_id?: string | null;
  exhibitor?: PostExhibitor | PostExhibitor[] | null;
  /** Cloudinary URL of an attached photo or clip, and which it is. */
  media_url: string | null;
  media_type: "image" | "video" | null;
  like_count: number;
  comment_count: number;
  view_count?: number;
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
  sessionId,
  isAdmin = false,
  myExhibitors = [],
}: {
  posts: PostRow[];
  likedIds: string[];
  myVotes: Record<string, string>;
  userId: string | null;
  errored: boolean;
  /** Admins may remove any post or reply. */
  isAdmin?: boolean;
  /** A session's own discussion, on its page; none for the Discuss feed. */
  sessionId?: string;
  /** Stalls the viewer runs or works on: they can post as these. */
  myExhibitors?: PostAsExhibitor[];
}) {
  // likedIds is the old single "Agree"; reactions (0033) now carry it.
  void likedIds;
  const postIds = useMemo(() => posts.map((p) => p.id), [posts]);
  const reactions = useReactions("post", postIds, userId);
  const watch = usePostViews();

  return (
    <div className="space-y-4">
      {/* On a session's page a guest gets the way in instead of a box that
          would only refuse them; the Discuss feed has its own prompt. */}
      {sessionId && !userId ? (
        <button
          type="button"
          onClick={() =>
            window.location.assign(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
          }
          className="flex h-11 w-full items-center justify-center rounded-md border border-brand-800 bg-white text-[14px] font-medium text-brand-800 transition-colors hover:bg-paper"
        >
          Log in to join the discussion
        </button>
      ) : (
        <Composer sessionId={sessionId} isAdmin={isAdmin} myExhibitors={myExhibitors} />
      )}

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
            <EmptyTitle>{sessionId ? "No one has posted about this session yet" : "Nothing here yet"}</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              reactions={reactions}
              watch={watch}
              myVote={myVotes[p.id] ?? null}
              userId={userId}
              isAdmin={isAdmin}
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

function Composer({
  sessionId,
  isAdmin = false,
  myExhibitors = [],
}: {
  sessionId?: string;
  isAdmin?: boolean;
  myExhibitors?: PostAsExhibitor[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const [isPoll, setIsPoll] = useState(false);
  // Admins pick, per post, whose name it goes out under.
  // Whose name the post goes out under: "me", "team" (admins) or a stall's
  // id. Admins start on the team, exhibitors on their stall.
  const [postAs, setPostAs] = useState<string>(
    isAdmin ? "team" : myExhibitors[0]?.id ?? "me"
  );
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [pending, startTransition] = useTransition();
  const [media, setMedia] = useState<UploadedMedia | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const canAttach = cloudinaryConfigured();

  // Words, a photo or a video, any of them on their own; a poll needs its
  // question and two answers.
  const canSubmit =
    (body.trim().length > 0 || !!media) &&
    !uploading &&
    (!isPoll || (body.trim().length > 0 && options.filter((o) => o.trim()).length >= 2));

  function pick(accept: string) {
    const input = fileRef.current;
    if (!input) return;
    input.accept = accept;
    input.click();
  }

  async function attach(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    try {
      setMedia(await uploadToCloudinary(file, setProgress));
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
      const send = () =>
        createPost(
          body,
          isPoll ? options : undefined,
          media ?? undefined,
          sessionId,
          isAdmin && postAs === "team",
          postAs !== "me" && postAs !== "team" ? postAs : undefined
        );
      // A plain post of your own can wait for signal; one with a photo, or
      // posted for the team or a stall, needs the network now.
      const res =
        !media && postAs === "me"
          ? await sendOrQueue(
              { kind: "post", body, options: isPoll ? options : undefined, sessionId },
              send
            )
          : await send();
      if (res !== "queued" && "error" in res) {
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
      {isAdmin || myExhibitors.length > 0 ? (
        <div
          role="radiogroup"
          aria-label="Post as"
          className="no-scrollbar -mx-3 mb-2.5 flex items-center gap-1.5 overflow-x-auto px-3"
        >
          <span className="mr-0.5 shrink-0 text-[12px] text-brand-900/60">Post as</span>
          {isAdmin ? (
            <PostAsChip on={postAs === "team"} onClick={() => setPostAs("team")} logo={TEAM_LOGO}>
              {TEAM_NAME}
            </PostAsChip>
          ) : null}
          {myExhibitors.map((x) => (
            <PostAsChip key={x.id} on={postAs === x.id} onClick={() => setPostAs(x.id)} logo={x.logo_url}>
              {x.name}
            </PostAsChip>
          ))}
          <PostAsChip on={postAs === "me"} onClick={() => setPostAs("me")}>
            My name
          </PostAsChip>
        </div>
      ) : null}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
        rows={isPoll ? 2 : 3}
        placeholder={
          isPoll
            ? "Ask the room a question…"
            : sessionId
              ? "Say something about this session…"
              : "Share something with the room…"
        }
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
              src={deliverUrl(media.url, "video")}
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
            className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-brand-900 text-white shadow-sm"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      <div className="mt-2.5 flex items-center justify-between">
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_ACCEPT}
          className="hidden"
          onChange={(e) => attach(e.target.files?.[0])}
        />
        {/* Photo, Video and Poll, each its own button: one "photo or clip"
            button hid that a video could be posted at all. */}
        <div className="flex items-center gap-0.5">
          {canAttach ? (
            uploading ? (
              <span className="inline-flex h-8 items-center gap-1.5 px-2.5 text-[12px] font-medium text-brand-800">
                <Loader2 className="size-3.5 animate-spin" />
                Uploading {Math.round(progress * 100)}%
              </span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => pick(IMAGE_ACCEPT)}
                  disabled={!!media}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-brand-800 transition-colors hover:bg-paper-deep disabled:opacity-50"
                >
                  <Camera className="size-3.5" strokeWidth={1.8} />
                  Photo
                </button>
                <button
                  type="button"
                  onClick={() => pick(VIDEO_ACCEPT)}
                  disabled={!!media}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-brand-800 transition-colors hover:bg-paper-deep disabled:opacity-50"
                >
                  <VideoGlyph className="size-3.5" />
                  Video
                </button>
              </>
            )
          ) : null}
          <button
            type="button"
            onClick={() => setIsPoll((v) => !v)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition-colors",
              isPoll ? "bg-brand-800 text-white" : "text-brand-800 hover:bg-paper-deep"
            )}
          >
            <SlidersHorizontal className="size-3.5" strokeWidth={1.8} />
            Poll
          </button>
        </div>
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

const TEAM_NAME = "PanIIT AP Summit Team";

interface PostExhibitor {
  id: string;
  name: string;
  logo_url: string | null;
  booth_number: string | null;
}

export interface PostAsExhibitor {
  id: string;
  name: string;
  logo_url: string | null;
}

function PostAsChip({
  on,
  onClick,
  logo,
  children,
}: {
  on: boolean;
  onClick: () => void;
  logo?: string | null;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 max-w-[220px] shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[12px] font-medium transition-colors",
        on ? "border-brand-800 bg-brand-800 text-white" : "border-rule bg-white text-brand-900 hover:bg-paper"
      )}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="size-4 shrink-0 rounded-sm bg-white object-contain" />
      ) : null}
      <span className="truncate">{children}</span>
    </button>
  );
}

/** A link to the author's profile, or plain text where there is none to
 *  give (the summit team's posts). */
function AuthorLink({
  href,
  className,
  children,
}: {
  href: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  if (!href) return <span className={className}>{children}</span>;
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/** The organisers' mark: a solid blue badge with a white tick, read at a
 *  glance the way the verified mark on X is. */
function VerifiedTick() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" role="img" aria-label="Verified organiser">
      <path
        fill="#1D9BF0"
        d="M9.78133 3.89027C10.3452 3.40974 10.6271 3.16948 10.9219 3.02859C11.6037 2.70271 12.3963 2.70271 13.0781 3.02859C13.3729 3.16948 13.6548 3.40974 14.2187 3.89027C14.4431 4.08152 14.5553 4.17715 14.6752 4.25747C14.9499 4.4416 15.2584 4.56939 15.5828 4.63344C15.7244 4.66139 15.8713 4.67312 16.1653 4.69657C16.9038 4.7555 17.273 4.78497 17.5811 4.89378C18.2936 5.14546 18.8541 5.70591 19.1058 6.41844C19.2146 6.72651 19.244 7.09576 19.303 7.83426C19.3264 8.12819 19.3381 8.27515 19.3661 8.41669C19.4301 8.74114 19.5579 9.04965 19.7421 9.32437C19.8224 9.44421 19.918 9.55642 20.1093 9.78084C20.5898 10.3447 20.8301 10.6267 20.971 10.9214C21.2968 11.6032 21.2968 12.3958 20.971 13.0776C20.8301 13.3724 20.5898 13.6543 20.1093 14.2182C19.918 14.4426 19.8224 14.5548 19.7421 14.6747C19.5579 14.9494 19.4301 15.2579 19.3661 15.5824C19.3381 15.7239 19.3264 15.8709 19.303 16.1648C19.244 16.9033 19.2146 17.2725 19.1058 17.5806C18.8541 18.2931 18.2936 18.8536 17.5811 19.1053C17.273 19.2141 16.9038 19.2435 16.1653 19.3025C15.8713 19.3259 15.7244 19.3377 15.5828 19.3656C15.2584 19.4297 14.9499 19.5574 14.6752 19.7416C14.5553 19.8219 14.4431 19.9175 14.2187 20.1088C13.6548 20.5893 13.3729 20.8296 13.0781 20.9705C12.3963 21.2963 11.6037 21.2963 10.9219 20.9705C10.6271 20.8296 10.3452 20.5893 9.78133 20.1088C9.55691 19.9175 9.44469 19.8219 9.32485 19.7416C9.05014 19.5574 8.74163 19.4297 8.41718 19.3656C8.27564 19.3377 8.12868 19.3259 7.83475 19.3025C7.09625 19.2435 6.72699 19.2141 6.41893 19.1053C5.7064 18.8536 5.14594 18.2931 4.89427 17.5806C4.78546 17.2725 4.75599 16.9033 4.69706 16.1648C4.6736 15.8709 4.66188 15.7239 4.63393 15.5824C4.56988 15.2579 4.44209 14.9494 4.25796 14.6747C4.17764 14.5548 4.08201 14.4426 3.89076 14.2182C3.41023 13.6543 3.16997 13.3724 3.02907 13.0776C2.7032 12.3958 2.7032 11.6032 3.02907 10.9214C3.16997 10.6266 3.41023 10.3447 3.89076 9.78084C4.08201 9.55642 4.17764 9.44421 4.25796 9.32437C4.44209 9.04965 4.56988 8.74114 4.63393 8.41669C4.66188 8.27515 4.6736 8.12819 4.69706 7.83426C4.75599 7.09576 4.78546 6.72651 4.89427 6.41844C5.14594 5.70591 5.7064 5.14546 6.41893 4.89378C6.72699 4.78497 7.09625 4.7555 7.83475 4.69657C8.12868 4.67312 8.27564 4.66139 8.41718 4.63344C8.74163 4.56939 9.05014 4.4416 9.32485 4.25747C9.4447 4.17715 9.55691 4.08152 9.78133 3.89027Z"
      />
      <path
        d="M8.5 12.5L10.5 14.5L15.5 9.5"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
const TEAM_LOGO = "/logo/paniit-mark.png";

function PostCard({
  post,
  reactions,
  watch,
  myVote,
  userId,
  isAdmin,
}: {
  post: PostRow;
  reactions: Reactions;
  /** Counts the post as seen once it has been on screen (post-views.ts). */
  watch: (el: HTMLElement | null) => void;
  myVote: string | null;
  userId: string | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [showComments, setShowComments] = useState(false);
  const a = author(post);
  // An admin's post goes out under the summit team's name and mark when
  // they chose that while posting; otherwise under their own name.
  const team = !!post.as_team && (a?.role === "organizer" || a?.role === "admin");
  // Posted as a stall: its logo and name, leading to its page.
  const stall = post.as_exhibitor_id
    ? (Array.isArray(post.exhibitor) ? post.exhibitor[0] : post.exhibitor) ?? null
    : null;
  const isMine = userId != null && post.author_id === userId;
  const canDelete = isMine || isAdmin;
  const displayName = stall ? stall.name : team ? TEAM_NAME : a?.full_name ?? "Attendee";
  // Deleting takes two taps: the first turns the bin into a red Delete.
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 4000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

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

  async function onShare() {
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#post-${post.id}`;
    const shareTitle = `Post by ${displayName}`;
    const shareText = post.body.trim() || "Join the discussion on PANIIT AP";

    try {
      if (navigator.share) {
        let imageFile: File | null = null;
        if (post.media_url && post.media_type === "image") {
          try {
            const response = await fetch(deliverUrl(post.media_url, "image"));
            if (response.ok) {
              const blob = await response.blob();
              const type = blob.type || "image/jpeg";
              const extension = type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
              imageFile = new File([blob], `discussion-${post.id}.${extension}`, { type });
            }
          } catch {
            // The link and caption can still be shared if the image cannot be fetched.
          }
        }

        const shareFiles: File[] | undefined =
          imageFile && navigator.canShare?.({ files: [imageFile] }) ? [imageFile] : undefined;
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url,
          ...(shareFiles ? { files: shareFiles } : {}),
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      toast({ title: "Post link copied", description: "Share it with anyone in the room." });
    } catch (error) {
      // Closing the native share sheet is an intentional action, not an error.
      if ((error as Error)?.name === "AbortError") return;
      toast({
        title: "Could not share post",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    }
  }

  return (
    <li
      id={`post-${post.id}`}
      ref={watch}
      data-post-id={post.id}
      className="rounded-lg border border-rule bg-white p-3.5"
    >
      <div className="flex items-start gap-2.5">
        {/* The team's posts lead nowhere: tapping the mark or the name must
            not open the profile of the admin who wrote it. */}
        <AuthorLink
          href={stall ? `/exhibitors/${stall.id}` : team ? null : `/attendees/${post.author_id}`}
          className="shrink-0"
        >
          {/* Square, as on the networking cards: at this size a circle crops
              the top of a head off every portrait. */}
          <Avatar className="size-9 rounded-md ring-1 ring-rule">
            {stall ? (
              stall.logo_url ? (
                <AvatarImage
                  src={stall.logo_url}
                  alt={stall.name}
                  className="rounded-md bg-white object-contain p-0.5"
                />
              ) : null
            ) : team ? (
              <AvatarImage
                src={TEAM_LOGO}
                alt={TEAM_NAME}
                className="rounded-md bg-white object-contain p-0.5"
              />
            ) : a?.photo_url ? (
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
        </AuthorLink>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <AuthorLink
              href={stall ? `/exhibitors/${stall.id}` : team ? null : `/attendees/${post.author_id}`}
              className={cn(
                "truncate text-[13px] font-semibold text-brand-950",
                !team && "hover:underline"
              )}
            >
              {displayName}
            </AuthorLink>
            {team ? (
              <VerifiedTick />
            ) : null}
            {viewsLabel(post.view_count ?? 0) !== null ? (
              <span
                className="inline-flex shrink-0 items-center gap-1 text-[11px] font-normal text-brand-900/55 tabular-nums"
                aria-label={`${post.view_count ?? 0} views`}
              >
                <span aria-hidden>·</span>
                <ViewsEye className="size-3.5" />
                {viewsLabel(post.view_count ?? 0)}
              </span>
            ) : null}
            {post.is_pinned ? (
              <span className="ml-auto shrink-0 rounded-full bg-paper-deep px-2 py-0.5 text-[10px] font-semibold text-brand-800">
                Pinned
              </span>
            ) : null}
          </div>
          {stall ? (
            <p className="truncate text-[11px] text-brand-950">
              Exhibitor{stall.booth_number ? ` · Stall ${stall.booth_number}` : ""}
            </p>
          ) : team ? (
            <p className="truncate text-[11px] text-brand-950">Organiser</p>
          ) : a?.designation || a?.company ? (
            <p className="truncate text-[11px] text-brand-950">
              {[a?.designation, a?.company].filter(Boolean).join(" | ")}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onShare}
          aria-label="Share post"
          title="Share post"
          className="ml-auto grid size-7 shrink-0 place-items-center rounded-md text-brand-900/45 transition-colors hover:bg-paper-deep hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/30"
        >
          <Share2 className="size-3.5" strokeWidth={1.8} />
        </button>
        {canDelete ? (
          confirmDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="h-7 shrink-0 rounded-md bg-iit-600 px-2.5 text-[12px] font-medium text-white disabled:opacity-50"
            >
              Delete
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={pending}
              aria-label="Delete post"
              className="grid size-7 shrink-0 place-items-center rounded-md text-brand-800/45 hover:bg-paper-deep hover:text-iit-500"
            >
              <Trash2 className="size-3.5" strokeWidth={1.7} />
            </button>
          )
        ) : null}
      </div>

      {post.body.trim() ? (
        <p className="mt-2 whitespace-pre-wrap text-[14px] leading-6 text-brand-950">
          {post.body}
        </p>
      ) : null}

      {/* Attachment in a square, capped so one photo cannot take the whole
          screen. A clip carries controls and no autoplay — a feed that starts
          playing at you is a feed people leave. */}
      {/* The picture in its own shape and the card's width, as tall as
          480 px: a square crop cut people out of group photos. Sent at a
          phone's width and in the lightest format the browser reads. */}
      {post.media_url ? (
        <div className="mt-2.5 overflow-hidden rounded-md bg-paper">
          {post.media_type === "video" ? (
            <video
              src={deliverUrl(post.media_url, "video")}
              controls
              playsInline
              preload="metadata"
              className="max-h-[480px] w-full bg-black"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={deliverUrl(post.media_url, "image")}
              alt=""
              loading="lazy"
              decoding="async"
              className="max-h-[480px] w-full object-contain"
            />
          )}
        </div>
      ) : null}

      {post.kind === "poll" && post.poll_options ? (
        <Poll post={post} myVote={myVote} signedIn={userId != null} />
      ) : null}

      <div className="mt-2.5 flex items-center gap-1">
        <ReactionBar id={post.id} reactions={reactions} />
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

      {showComments ? <Comments postId={post.id} userId={userId} isAdmin={isAdmin} /> : null}
    </li>
  );
}

/** The summit's own eye mark for views: an open eye with three lashes. */
function ViewsEye({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M2.3 14.5Q12 3.3 21.7 14.5Q12 25.7 2.3 14.5Z" />
      <circle cx="12" cy="14.5" r="3.5" />
      <path d="M12 3.2v3.4M4.4 5.4l1.8 2.2M19.6 5.4l-1.8 2.2" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Poll                                                                */
/* ------------------------------------------------------------------ */

function Poll({
  post,
  myVote,
  signedIn,
}: {
  post: PostRow;
  myVote: string | null;
  signedIn: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [pending, startTransition] = useTransition();
  const [voted, setVoted] = useState<string | null>(myVote);
  useEffect(() => setVoted(myVote), [myVote]);

  // The counts as the server last sent them, kept live from there. The
  // feed does re-fetch when anything moves, but only after it goes quiet
  // for a second and a half, and a poll being answered by a room is never
  // quiet: each option's own row is listened to instead, and its count
  // taken as it arrives.
  const fromServer = useMemo(
    () => Object.fromEntries((post.poll_options ?? []).map((o) => [o.id, o.vote_count])),
    [post.poll_options]
  );
  const [counts, setCounts] = useState<Record<string, number>>(fromServer);
  useEffect(() => setCounts(fromServer), [fromServer]);

  useEffect(() => {
    const ch = supabase
      .channel(`poll-${post.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "poll_options",
          filter: `post_id=eq.${post.id}`,
        },
        (payload) => {
          const row = payload.new as { id: string; vote_count: number };
          setCounts((c) => ({ ...c, [row.id]: row.vote_count }));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [post.id, supabase]);

  const options = [...(post.poll_options ?? [])].sort((a, b) => a.position - b.position);
  const countOf = (id: string) => Math.max(0, counts[id] ?? 0);
  const total = options.reduce((n, o) => n + countOf(o.id), 0);

  function cast(optionId: string) {
    if (!signedIn) {
      router.push("/login?redirect=%2Fdiscuss");
      return;
    }
    if (pending || voted === optionId) return;
    const before = voted;
    // Your own vote shows at once, tick and bars both; the counts the
    // table sends back afterwards are totals, so they replace these
    // rather than add to them.
    const move = (by: 1 | -1) =>
      setCounts((c) => {
        const next = { ...c, [optionId]: (c[optionId] ?? 0) + by };
        if (before) next[before] = (c[before] ?? 0) - by;
        return next;
      });
    setVoted(optionId);
    move(1);
    startTransition(async () => {
      const res = await sendOrQueue({ kind: "vote", postId: post.id, optionId }, () =>
        votePoll(post.id, optionId)
      );
      if (res !== "queued" && "error" in res) {
        setVoted(before);
        move(-1);
        if (res.error === "unauth") router.push("/login?redirect=%2Fdiscuss");
      }
    });
  }

  // Once you have voted, each answer is coloured by where it stands: the one
  // in front green, the one behind red, the rest amber. Ties share a colour.
  const tallies = options.map((o) => countOf(o.id));
  const top = Math.max(0, ...tallies);
  const bottom = Math.min(...tallies);
  const tone = (n: number) =>
    n === top && top > 0
      ? { fill: "bg-[#DCFCE7]", text: "text-[#15803D]", edge: "border-[#86EFAC]" }
      : n === bottom && bottom < top
        ? { fill: "bg-[#FEE2E2]", text: "text-[#B91C1C]", edge: "border-[#FCA5A5]" }
        : { fill: "bg-[#FEF3C7]", text: "text-[#B45309]", edge: "border-[#FCD34D]" };

  return (
    <div className="mt-3">
      <span className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand-950">
        <PollGlyph className="size-3.5" />
        Poll
      </span>

      <div className="space-y-2">
        {options.map((o, i) => {
          const n = countOf(o.id);
          const pct = total > 0 ? Math.round((n / total) * 100) : 0;
          const mine = voted === o.id;
          const t = voted ? tone(n) : null;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => cast(o.id)}
              disabled={pending}
              aria-pressed={mine}
              className={cn(
                "relative flex w-full items-center gap-3 overflow-hidden rounded-[4px] border bg-white px-3 py-2.5 text-left transition-colors",
                t ? t.edge : "border-rule hover:border-brand-950",
                mine && "border-2"
              )}
            >
              {/* Results stay hidden until you have answered, so early votes
                  do not steer anyone else's. */}
              {t ? (
                <span
                  aria-hidden
                  className={cn("absolute inset-y-0 left-0 transition-[width] duration-700 ease-out", t.fill)}
                  style={{ width: `${pct}%` }}
                />
              ) : null}

              <span className="relative w-4 shrink-0 text-[14px] font-semibold tabular-nums text-brand-950">{i + 1}</span>

              <span className={cn("relative min-w-0 flex-1 text-[14px] leading-snug text-brand-950", mine && "font-semibold")}>
                {o.label}
              </span>

              {t ? (
                <span className="relative inline-flex shrink-0 items-center gap-1 text-[14px] font-semibold tabular-nums text-brand-950">
                  {mine ? <Check className="size-4" strokeWidth={2.6} aria-label="Your vote" /> : null}
                  {pct}%
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[12px] text-brand-950">
        {voted
          ? "You voted · tap another option to change"
          : total === 0
            ? "Be the first to vote"
            : "Tap an option to vote"}
      </p>
    </div>
  );
}

function PollGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      <rect x="2" y="3" width="9" height="2.4" rx="1.2" fill="currentColor" />
      <rect x="2" y="6.8" width="12" height="2.4" rx="1.2" fill="currentColor" opacity="0.55" />
      <rect x="2" y="10.6" width="6" height="2.4" rx="1.2" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Comments — fetched on demand, not with the feed                      */
/* ------------------------------------------------------------------ */

function Comments({
  postId,
  userId,
  isAdmin,
}: {
  postId: string;
  userId: string | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<CommentRow[] | null>(null);
  const commentIds = useMemo(() => (rows ?? []).map((c) => c.id), [rows]);
  const replyReactions = useReactions("comment", commentIds, userId);
  const [body, setBody] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  // The reply waiting for its second tap to be deleted.
  const [armed, setArmed] = useState<string | null>(null);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(null), 4000);
    return () => clearTimeout(t);
  }, [armed]);

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

  function removeComment(id: string) {
    setArmed(null);
    startTransition(async () => {
      const res = await deleteComment(id);
      if ("error" in res) return;
      setRows((list) => (list ?? []).filter((c) => c.id !== id));
      router.refresh();
    });
  }

  function submit() {
    const text = body.trim();
    if (!text || pending) return;
    startTransition(async () => {
      const res = await sendOrQueue({ kind: "comment", postId, body: text }, () =>
        addComment(postId, text)
      );
      if (res === "queued") {
        setBody("");
        return;
      }
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
        <>
          <ul className="space-y-2">
          {rows.slice(0, showAll ? rows.length : 2).map((c) => {
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
                  <div className="-ml-1.5 mt-0.5">
                    <ReactionBar id={c.id} reactions={replyReactions} compact />
                  </div>
                </div>
                {userId != null && (c.user_id === userId || isAdmin) ? (
                  armed === c.id ? (
                    <button
                      type="button"
                      onClick={() => removeComment(c.id)}
                      disabled={pending}
                      className="h-6 shrink-0 rounded bg-iit-600 px-2 text-[11px] font-medium text-white disabled:opacity-50"
                    >
                      Delete
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setArmed(c.id)}
                      disabled={pending}
                      aria-label="Delete reply"
                      className="grid size-6 shrink-0 place-items-center rounded text-brand-800/40 hover:bg-paper-deep hover:text-iit-500"
                    >
                      <Trash2 className="size-3" strokeWidth={1.7} />
                    </button>
                  )
                ) : null}
              </li>
            );
          })}
          </ul>
          {rows.length > 2 && !showAll ? (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="mt-2 text-[12px] font-semibold text-brand-800 hover:underline"
            >
              View all {rows.length} comments
            </button>
          ) : null}
        </>
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

/** A video camera, drawn to sit with the Solar set's linear icons. */
function VideoGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden="true">
      <rect x="2" y="6" width="14" height="12" rx="3" />
      <path strokeLinejoin="round" d="M16 10.5l5-3v9l-5-3z" />
    </svg>
  );
}
