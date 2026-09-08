"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{name ?? "My badge"}</DialogTitle>
          <DialogDescription>
            Have another attendee scan this to connect with you.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-2">
          {loading ? (
            <Loader2 className="size-5 animate-spin text-brand-800/60" />
          ) : token ? (
            <MyQr token={token} />
          ) : (
            <p className="text-sm text-brand-800/75">
              Your QR badge isn&apos;t available yet.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
