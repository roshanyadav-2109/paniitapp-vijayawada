"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "@/components/icons";

/**
 * A profile photo, full size — the way WhatsApp opens a contact's picture.
 *
 * Avatars anywhere in the app open it by dispatching an event (see
 * `openPhoto`), so a list of fifty attendees does not mount fifty dialogs,
 * and a screen does not have to know the viewer exists.
 *
 * Opening pushes a history entry, so the phone's back button closes the
 * photo rather than leaving the screen underneath.
 */

const EVENT = "photo-viewer:open";

type Photo = { src: string; name: string };

export function openPhoto(photo: Photo) {
  window.dispatchEvent(new CustomEvent<Photo>(EVENT, { detail: photo }));
}

export function PhotoViewer() {
  const [photo, setPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setPhoto((e as CustomEvent<Photo>).detail);
      window.history.pushState({ photoViewer: true }, "");
    };
    const onPop = () => setPhoto(null);
    window.addEventListener(EVENT, onOpen);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener(EVENT, onOpen);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  // Closing by tap or Escape unwinds the history entry opening added; the
  // popstate that follows is what actually clears the photo.
  const close = useCallback(() => {
    if (window.history.state?.photoViewer) window.history.back();
    else setPhoto(null);
  }, []);

  useEffect(() => {
    if (!photo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [photo, close]);

  if (!photo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.name ? `${photo.name}'s photo` : "Profile photo"}
      onClick={close}
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 animate-in fade-in duration-150"
    >
      <div className="flex items-center gap-3 px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)] text-white">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="-ml-1 grid size-10 place-items-center rounded-full hover:bg-white/10"
        >
          <X className="size-6" strokeWidth={1.8} />
        </button>
        <span className="truncate font-display text-[17px] font-semibold">{photo.name}</span>
      </div>
      <div className="flex flex-1 items-center justify-center pb-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.src}
          alt={photo.name}
          onClick={(e) => e.stopPropagation()}
          className="aspect-square w-full max-w-[min(100vw,560px)] object-cover animate-in zoom-in-95 duration-150"
          draggable={false}
        />
      </div>
    </div>
  );
}
