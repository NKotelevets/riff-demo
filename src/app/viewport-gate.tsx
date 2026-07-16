"use client";

import { useSyncExternalStore, type ReactNode } from "react";

// Must stay in sync with the `lg:` variants in page.tsx. Tailwind v4's default
// `lg` is 64rem/1024px and globals.css does not override the breakpoints.
const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(DESKTOP_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

const getSnapshot = (): boolean | null => window.matchMedia(DESKTOP_QUERY).matches;

// The viewport is unknowable while rendering on the server, so both gates stay
// closed until mount rather than guessing and mismatching during hydration.
const getServerSnapshot = (): boolean | null => null;

function useIsDesktop() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// `hidden lg:block` only stops a subtree from *painting* — React still mounts it
// and runs its effects on the other viewport. These gates keep the subtree out
// of the tree entirely, which is what actually stops the effects.

export function DesktopOnly({ children }: { children: ReactNode }) {
  return useIsDesktop() === true ? <>{children}</> : null;
}

export function MobileOnly({ children }: { children: ReactNode }) {
  return useIsDesktop() === false ? <>{children}</> : null;
}
