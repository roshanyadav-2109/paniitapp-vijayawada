"use client";

import { useEffect, useState } from "react";
import {
  isIosSafari,
  isSnoozed,
  isStandalone,
  type AppPromptKind,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa";

/**
 * What, if anything, the app should still be asking this visitor for.
 *
 * Two consumers share this: the slide-up sheet and the banner above the gate
 * pass on the home screen. Both listen for `beforeinstallprompt` themselves —
 * a browser event reaches every listener, so there is no need to hoist the
 * deferred event into a context.
 *
 * Nothing is computed during render: the first paint on the server has no
 * idea whether this is a standalone window, so everything lands in an effect
 * and `ready` keeps the markup identical until it has run.
 */
export interface AppPromptStatus {
  /** False until the client-side checks have run. */
  ready: boolean;
  installed: boolean;
  /** Chrome's deferred install event, when it has fired. */
  deferred: BeforeInstallPromptEvent | null;
  ios: boolean;
  permission: NotificationPermission | "unsupported";
  setPermission: (p: NotificationPermission) => void;
  /** The one thing worth asking for now, ignoring snoozes. */
  pending: AppPromptKind | null;
  /** As `pending`, but silent while the visitor's dismissal still stands. */
  due: AppPromptKind | null;
}

// Locally there is no install banner to catch — Chrome only fires
// beforeinstallprompt over https on a site it considers installable — so dev
// treats the app as installable in order to make the flow reviewable.
const DEV_PREVIEW = process.env.NODE_ENV !== "production";

// The offer does not wait for beforeinstallprompt. That event fires on
// Chrome's own schedule and never at all on iOS, on desktop Safari, or in an
// in-app browser — which meant the one screen telling people the app can be
// installed was invisible to most of them. Anyone not already running it
// standalone is offered it; where the browser gives us no prompt to fire,
// the sheet says how to do it by hand.

export function useAppPrompt(signedIn = false): AppPromptStatus {
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIosSafari());
    setPermission(
      "Notification" in window ? Notification.permission : "unsupported"
    );
    setReady(true);

    const onBeforeInstall = (e: Event) => {
      // Keep Chrome's own mini-infobar out of the way; the sheet asks.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    const display = window.matchMedia("(display-mode: standalone)");
    const onDisplay = () => setInstalled(isStandalone());

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    display.addEventListener?.("change", onDisplay);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      display.removeEventListener?.("change", onDisplay);
    };
  }, []);

  // And only of someone we can actually send anything to: a push
  // subscription is stored against a profile, so asking a guest for
  // permission buys an interruption and nothing else — installed or not.
  const wantsNotifications = signedIn && permission === "default";

  // Notifications are asked for only once the app is installed. In a tab the
  // permission belongs to the browser rather than to the app, and a visitor
  // who has not committed to installing has not asked to be interrupted
  // either — so a tab gets the install offer or nothing.
  let pending: AppPromptKind | null = null;
  if (!ready) pending = null;
  else if (!installed) pending = "install";
  else if (wantsNotifications) pending = "notifications";

  const due = pending && !isSnoozed(pending) ? pending : null;

  return {
    ready,
    installed,
    deferred,
    ios,
    permission,
    setPermission,
    pending,
    due,
  };
}
