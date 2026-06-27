"use client";

import { useEffect, useState, useCallback } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type PushStatus = "unsupported" | "unsubscribed" | "subscribed" | "denied" | "loading";

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [error, setError] = useState("");

  const saveSubscription = useCallback(async (subscription: PushSubscription) => {
    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...subscription.toJSON(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Could not register this device.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setStatus("unsupported");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const subscription = await registration.pushManager.getSubscription();
        if (cancelled) return;

        if (subscription) {
          await saveSubscription(subscription);
          if (!cancelled) {
            setStatus("subscribed");
            setError("");
          }
        } else if (Notification.permission === "denied") {
          setStatus("denied");
        } else {
          setStatus("unsubscribed");
        }
      } catch (cause) {
        if (!cancelled) {
          setStatus(Notification.permission === "denied" ? "denied" : "unsubscribed");
          setError(cause instanceof Error ? cause.message : "Could not initialize notifications.");
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [saveSubscription]);

  const subscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) throw new Error("Notifications are not configured on this deployment.");

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      await saveSubscription(subscription);
      setStatus("subscribed");
    } catch (cause) {
      setStatus("unsubscribed");
      setError(cause instanceof Error ? cause.message : "Could not enable notifications.");
    }
  }, [saveSubscription]);

  const unsubscribe = useCallback(async () => {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const response = await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
      if (!response.ok) {
        setError("Could not remove this device from your account.");
        return;
      }
      await subscription.unsubscribe();
    }
    setStatus("unsubscribed");
  }, []);

  return { status, error, subscribe, unsubscribe };
}
