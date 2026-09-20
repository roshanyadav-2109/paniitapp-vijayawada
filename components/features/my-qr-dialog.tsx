"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { Loader2 } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import { EmptyArt } from "@/components/features/empty-art";
import { MyQr } from "./my-qr";

export function MyQrDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [token, setToken] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setSignedOut(true);
          setLoading(false);
        }
        return;
      }
      if (!cancelled) setSignedOut(false);
      const { data } = await supabase
        .from("profiles")
        .select("qr_token, full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setToken((data as { qr_token: string | null } | null)?.qr_token ?? null);
      setName((data as { full_name: string | null } | null)?.full_name ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, supabase]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm overflow-hidden">
        <DialogHeader>
          <DialogTitle>{name ?? "My badge"}</DialogTitle>
          <DialogDescription>
            {signedOut
              ? "Badges are issued to your account."
              : "Have another attendee scan this to connect with you."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-2">
          {loading ? (
            <Loader2 className="size-5 animate-spin text-brand-800/60" />
          ) : token ? (
            <MyQr token={token} />
          ) : (
            // A guest has no badge because a badge is issued to an account,
            // not because anything went wrong. Saying so, with the way in.
            <div className="flex flex-col items-center px-2 text-center">
              <EmptyArt name="empty-badge" className="mb-3 size-20" />
              <p className="text-[14px] text-brand-950">
                {signedOut
                  ? "Your badge is available once you log in."
                  : "Your QR badge isn't available yet."}
              </p>
              {signedOut ? (
                <Link
                  href="/login?redirect=%2Fhome"
                  className="mt-4 inline-flex h-9 items-center rounded-md bg-brand-800 px-4 text-[13px] font-medium text-white transition-colors hover:bg-brand-900"
                >
                  Login
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
