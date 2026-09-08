"use client";

import { useEffect, useState } from "react";

export default function GoogleCallbackPage() {
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.search.slice(1)
    );
    const error = params.get("error") || params.get("error_description");
    if (error) {
      window.location.replace(`/?error=${encodeURIComponent(error)}`);
      return;
    }

    const idToken = params.get("id_token");
    const accessToken = params.get("access_token");
    const state = params.get("state");
    window.history.replaceState(null, "", window.location.pathname);

    if (!idToken || !state) {
      window.location.replace("/?error=missing_google_id_token");
      return;
    }

    async function completeSignIn() {
      const response = await fetch("/api/auth/google/id-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_token: idToken,
          access_token: accessToken,
          state,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        redirectTo?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.redirectTo) {
        throw new Error(payload?.error || "google_sign_in_failed");
      }

      window.location.replace(payload.redirectTo);
    }

    completeSignIn().catch((err) => {
      const errorMessage =
        err instanceof Error ? err.message : "google_sign_in_failed";
      setMessage("Could not complete sign-in.");
      window.location.replace(`/?error=${encodeURIComponent(errorMessage)}`);
    });
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-center">
      <p className="text-sm font-medium text-brand-900">{message}</p>
    </main>
  );
}
