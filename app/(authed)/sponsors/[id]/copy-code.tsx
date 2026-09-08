"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyOfferCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <div className="mt-3 flex items-center gap-2 rounded-md border border-slate-200 bg-white p-3">
      <code className="flex-1 select-all text-sm font-medium tabular-nums text-brand-900">
        {code}
      </code>
      <Button size="sm" variant="outline" onClick={copy} className="gap-1.5">
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
