"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface Props {
  vapidPublicKey: string | null;
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; ++i) view[i] = raw.charCodeAt(i);
  return buf;
}

export function PushPrompt({ vapidPublicKey }: Props) {
  const { toast } = useToast();
  const [supported, setSupported] = useState<boolean>(false);
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(ok);
    if (ok) {
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      });
    }
  }, []);

  if (!supported) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-500">
        Notifications aren't supported in this browser.
      </div>
    );
  }
  if (!vapidPublicKey) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-500">
        Notifications aren't configured yet. Check back later.
      </div>
    );
  }

  async function subscribe() {
    if (!vapidPublicKey) return;
    startTransition(async () => {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          toast({ title: "Notifications blocked", variant: "destructive" });
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
        const res = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        });
        if (!res.ok) throw new Error("Server rejected the subscription");
        setSubscribed(true);
        toast({ title: "Notifications on" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not enable";
        toast({ title: "Push failed", description: msg, variant: "destructive" });
      }
    });
  }

  async function unsubscribe() {
    startTransition(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await fetch("/api/push/subscribe", { method: "DELETE" });
      setSubscribed(false);
      toast({ title: "Notifications off" });
    });
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-brand-900">Event notifications</div>
          <div className="text-xs text-slate-500">
            Session reminders, meeting requests, urgent updates.
          </div>
        </div>
        {subscribed ? (
          <Button variant="outline" size="sm" onClick={unsubscribe} disabled={pending}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellOff className="h-3.5 w-3.5" />}
            Turn off
          </Button>
        ) : (
          <Button size="sm" onClick={subscribe} disabled={pending}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
            Turn on
          </Button>
        )}
      </div>
    </div>
  );
}
