"use client";

import { useEffect, useMemo, useState } from "react";
import { QrCode } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MyQr } from "./my-qr";
import { QrScanner } from "./qr-scanner";
import { createClient } from "@/lib/supabase/client";

export function QrConnect() {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("qr_token, full_name")
        .eq("id", user.id)
        .maybeSingle();
      setToken(data?.qr_token ?? null);
      setName(data?.full_name ?? null);
      setLoading(false);
    })();
  }, [open, supabase]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <button
              type="button"
              aria-label="Connect via QR code"
              className="inline-grid size-9 place-items-center rounded-md text-slate-600 transition-colors hover:bg-slate-100"
            >
              <QrCode className="size-[18px]" />
            </button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Scan or show your badge</TooltipContent>
      </Tooltip>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Connect via QR</SheetTitle>
          <SheetDescription>
            Show your badge, or scan another attendee&apos;s to swap contacts instantly.
          </SheetDescription>
        </SheetHeader>
        <div className="px-6 pb-6 pt-2">
          <Tabs defaultValue="show" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="show">My badge</TabsTrigger>
              <TabsTrigger value="scan">Scan</TabsTrigger>
            </TabsList>

            <TabsContent value="show" className="mt-4">
              {loading ? (
                <div className="flex justify-center">
                  <Skeleton className="size-72 rounded-lg" />
                </div>
              ) : token ? (
                <div className="flex flex-col items-center gap-3">
                  <MyQr token={token} />
                  {name ? (
                    <p className="text-xs font-medium text-slate-600">{name}</p>
                  ) : null}
                </div>
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <QrCode />
                    </EmptyMedia>
                    <EmptyTitle>No badge token yet</EmptyTitle>
                    <EmptyDescription>
                      Contact organizers — your QR token isn&apos;t set.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </TabsContent>

            <TabsContent value="scan" className="mt-4">
              <QrScanner />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
