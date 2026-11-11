"use client";

import { useEffect } from "react";

export function usePublicViewGuard(stateKey: string) {
  useEffect(() => {
    const currentUrl = window.location.href;
    const baseState =
      window.history.state && typeof window.history.state === "object"
        ? window.history.state
        : {};

    try {
      window.opener = null;
    } catch {
      // Some browsers expose window.opener as read-only.
    }

    const keepPublicViewOpen = () => {
      window.history.pushState(
        { ...baseState, [stateKey]: true },
        "",
        currentUrl
      );
    };

    if (!window.history.state?.[stateKey]) {
      window.history.replaceState(
        { ...baseState, publicInventoryView: true },
        "",
        currentUrl
      );
      keepPublicViewOpen();
    }

    window.addEventListener("popstate", keepPublicViewOpen);
    return () => window.removeEventListener("popstate", keepPublicViewOpen);
  }, [stateKey]);
}
