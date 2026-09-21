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
  /** Whether a push subscription actually exists. null until checked. */
  subscribed: boolean | null;
  setSubscribed: (v: boolean) => void;
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

export interface AppPromptInput {
  signedIn?: boolean;
  /** Does THIS account have a subscription stored? Read on the server. */
  pushRegistered?: boolean;
  /** The account id, so one person's "Not now" is not another's. */
  scope?: string | null;
}

export function useAppPrompt({
  signedIn = false,
  pushRegistered = false,
  scope = null,
}: AppPromptInput = {}): AppPromptStatus {
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const [subscribed, setSubscribed] = useState<boolean | null>(null);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIosSafari());
    setPermission(
      "Notification" in window ? Notification.permission : "unsupported"
    );
    setReady(true);

    // Permission is not the question — a subscription is. Someone who
    // allowed notifications before the VAPID keys were configured has
    // permission and no subscription, so nothing can ever be sent to them,
    // and a prompt keyed on permission would never appear again to fix it.
    // serviceWorker.ready never settles where no worker takes control, so
    // it is raced against a timeout rather than awaited.
    if ("serviceWorker" in navigator && "PushManager" in window) {
      Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((r) => setTimeout(() => r(null), 3000)),
      ])
        .then((reg) =>
          reg ? (reg as ServiceWorkerRegistration).pushManager.getSubscription() : null
        )
        .then((sub) => setSubscribed(!!sub))
        .catch(() => setSubscribed(false));
    } else {
      setSubscribed(false);
    }

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

  // The question is whether THIS account can be sent to, which the browser
  // cannot answer by itself: a subscription belongs to the browser but is
  // stored against a profile, so on a shared phone the second person to sign
  // in inherits a subscription that is filed under somebody else. The
  // server's answer decides it; the browser's only says whether a new
  // permission prompt is needed.
  //
  // Refused counts as not registered and keeps the offer up. The browser
  // will not show the prompt again, so the sheet says where the setting is —
  // hiding it would leave somebody who tapped Block by accident with no way
  // back and no explanation.
  const wantsNotifications = signedIn && !pushRegistered;

  // Notifications are asked for only once the app is installed. In a tab the
  // permission belongs to the browser rather than to the app, and a visitor
  // who has not committed to installing has not asked to be interrupted
  // either — so a tab gets the install offer or nothing.
  let pending: AppPromptKind | null = null;
  if (!ready) pending = null;
  else if (!installed) pending = "install";
  else if (wantsNotifications) pending = "notifications";

  const due = pending && !isSnoozed(pending, scope) ? pending : null;

  return {
    ready,
    installed,
    deferred,
    ios,
    permission,
    setPermission,
    subscribed,
    setSubscribed,
    pending,
    due,
  };
}
