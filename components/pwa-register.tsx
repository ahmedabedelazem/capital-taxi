"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    async function registerWorker() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        if (cancelled) return;
        await registration.update().catch(() => undefined);
      } catch (error) {
        // PWA installation is progressive enhancement; the web app must keep
        // working normally if service-worker registration is unavailable.
        if (process.env.NODE_ENV !== "production") {
          console.warn("Capital Taxi service worker registration failed.", error);
        }
      }
    }

    void registerWorker();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
