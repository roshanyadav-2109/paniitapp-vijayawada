"use client";

import { useCallback, useEffect, useLayoutEffect, useState, type Dispatch, type SetStateAction } from "react";
import { usePathname } from "next/navigation";

// useLayoutEffect warns on the server; on the server there is nothing to do.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * useState that a screen keeps for the rest of the visit.
 *
 * A screen's own choices — the tab, the filter, the floor — live in its
 * component, and the component goes when you open something and comes back
 * new when you press Back, which put you on the default tab every time.
 * This keeps the value in sessionStorage under the screen's path, so Back,
 * and a reload for a new release, come back to what you had chosen. It
 * lasts as long as the tab: a fresh visit starts from the defaults.
 *
 * The server renders the default; the stored value is put back before the
 * first paint, so there is no flash of the default and no mismatch. Only a
 * choice writes to storage, never a render: a screen drawn afresh with its
 * default must not write that default over what was chosen.
 */
export function useRememberedState<T>(
  key: string,
  initial: T | (() => T)
): [T, Dispatch<SetStateAction<T>>] {
  const pathname = usePathname();
  const storageKey = `ui:${pathname}:${key}`;
  const [value, setValue] = useState<T>(initial);

  useIsoLayoutEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // storage blocked or the stored value unreadable: keep the default
    }
  }, [storageKey]);

  const choose = useCallback<Dispatch<SetStateAction<T>>>(
    (next) => {
      setValue((prev) => {
        const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          window.sessionStorage.setItem(storageKey, JSON.stringify(v));
        } catch {
          // storage full or blocked: the screen still works, it just forgets
        }
        return v;
      });
    },
    [storageKey]
  );

  return [value, choose];
}
