"use client";

import Image from "next/image";
import { useDriftScroll } from "@/hooks/use-drift-scroll";
import { EVENT_POSTS } from "@/lib/event-config";

/**
 * What the summit looks like on X — ANI, the Chief Minister, the state's
 * information department and the organisers, in their own words.
 *
 * Built as our own cards rather than with X's embed script. The script is a
 * third-party bundle per post that reflows the page as it loads and renders
 * nothing where x.com is blocked; these render from mirrored text and images
 * at the same cost as any other picture on the page. The debt is that a post
 * edited or deleted later will not update here, which is why the whole card
 * is a link to the original.
 *
 * The row drifts on its own and can also be swiped: it is a real scroll
 * container, not a translated track, so a finger, a trackpad or a wheel all
 * move it, and the drift stands aside while they do. It pauses under the
 * pointer or whenever a card inside it takes keyboard focus — a post that
 * walks off mid-sentence is worse than a still one. Cards are a fixed width
 * here, unlike the press strip's percentage of the viewport: the loop wraps
 * at exactly half the track, and that only lands seamlessly if every card is
 * the same size on every screen.
 */
export function PostStrip() {
  const ref = useDriftScroll<HTMLDivElement>(24);

  if (EVENT_POSTS.length === 0) return null;

  // Newest first, sorted here rather than trusted to the order someone
  // happened to paste a post into the config.
  const posts = [...EVENT_POSTS].sort((a, b) => b.at.localeCompare(a.at));
  const stream = [...posts, ...posts];
  const half = posts.length;

  return (
    <div
      ref={ref}
      className="no-scrollbar -mx-3 overflow-x-auto overscroll-x-contain pb-1 [scroll-behavior:auto] sm:-mx-5 lg:-mx-6"
      aria-label="Posts about the summit on X"
    >
      {/* Inset on this div, not on the list: the loop wraps by half the
          track's width, and padding there would make half a width land short
          of one full copy — a visible jump every time round. */}
      <div className="pl-3 sm:pl-5 lg:pl-6">
        <ul className="flex w-max items-stretch">
          {stream.map((post, i) => (
            <li
              key={`${post.href}-${i}`}
              className="mr-3 w-[286px] shrink-0 sm:w-[320px]"
              aria-hidden={i >= half}
            >
              <a
                href={post.href}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={i >= half ? -1 : undefined}
                className="flex h-full flex-col rounded-md border border-rule bg-white p-3.5 transition-colors hover:bg-paper-deep/40"
              >
                <span className="flex items-start gap-2.5">
                  <Image
                    src={post.avatar}
                    alt=""
                    width={96}
                    height={96}
                    className="size-9 shrink-0 rounded-full object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1">
                      <span className="truncate font-display text-[13.5px] font-semibold leading-tight text-brand-950">
                        {post.name}
                      </span>
                      {post.badge ? <VerifiedMark tone={post.badge} /> : null}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] leading-tight text-brand-900/50">
                      @{post.handle} | {post.date}
                    </span>
                  </span>
                  <XMark />
                </span>

                {/* whitespace-pre-line keeps the author's line breaks, which is
                most of what makes a poster caption readable. The clamp is on
                the card, not the data — the post is quoted in full. */}
                <span className="mt-2.5 line-clamp-4 whitespace-pre-line text-[13px] leading-5 text-brand-900/85">
                  {post.text}
                </span>

                {/* Posters are portrait, photographs landscape. A fixed 4:3 band
                anchored to the top keeps the row level and keeps a poster's
                title inside the crop. */}
                <span className="relative mt-3 block aspect-[4/3] w-full overflow-hidden rounded-[3px] bg-paper-deep">
                  <Image
                    src={post.image}
                    alt={post.imageAlt}
                    fill
                    sizes="(max-width: 640px) 82vw, (max-width: 1024px) 48vw, 32vw"
                    className="object-cover object-top"
                  />
                  {/* A still frame with no play mark reads as a photograph,
                  and tapping through to a video is then a surprise. */}
                  {post.video ? (
                    <span
                      aria-hidden
                      className="absolute inset-0 grid place-items-center"
                    >
                      <span className="grid size-11 place-items-center rounded-full bg-brand-950/65">
                        <svg
                          viewBox="0 0 24 24"
                          className="size-5 translate-x-[1px] fill-white"
                        >
                          <path d="M8 5.5v13l11-6.5z" />
                        </svg>
                      </span>
                    </span>
                  ) : null}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function XMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className="size-3.5 shrink-0 fill-brand-950/35"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/**
 * X's check, in the colour X gives that account: blue for an individual,
 * gold for a verified organisation. Same mark — the difference people read
 * is the colour — and no mark at all for an account that carries none.
 */
function VerifiedMark({ tone }: { tone: "blue" | "gold" }) {
  return (
    <svg
      viewBox="0 0 22 22"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={
        tone === "gold" ? "Verified organisation" : "Verified account"
      }
      role="img"
      className={`size-3.5 shrink-0 ${
        tone === "gold" ? "fill-[#E2B719]" : "fill-[#1D9BF0]"
      }`}
    >
      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.303 1.906.185.64-.118 1.232-.413 1.703-.85.437-.47.732-1.065.85-1.704.117-.64.052-1.3-.188-1.903.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
    </svg>
  );
}
