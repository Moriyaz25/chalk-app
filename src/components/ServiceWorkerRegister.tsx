"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then(async (registration) => {
          registration.update().catch(() => {});
          if (window.location.pathname.startsWith("/login")) return;
          const subscription = await registration.pushManager.getSubscription();
          if (!subscription) return;
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...subscription.toJSON(),
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
            }),
          });
        })
        .catch((err) => {
          console.error("Service worker registration failed:", err);
        });
    }
  }, []);

  return null;
}
