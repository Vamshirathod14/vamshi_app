import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../api/client.js";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function detectSupport() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// Browser Web Push: enable/disable a device subscription, keep the server in
// sync, and send a test notification. Never called automatically — always from
// an explicit user tap (permission must be user-initiated).
export function usePushNotifications() {
  const supported = detectSupport();
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "unsupported",
  );
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const pollServerState = useCallback(async () => {
    if (!supported) return;
    try {
      const { enabled: active } = await api.get(
        "/api/notifications/push/status",
      );
      const sub = await getActiveSubscription();
      // A device is "on" when the server says so and this device actually has
      // a push subscription.
      setEnabled(Boolean(active) && Boolean(sub));
    } catch {
      // not authenticated or server down — keep current state
    }
  }, [supported]);

  useEffect(() => {
    setPermission(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
    if (supported) pollServerState();
  }, [supported, pollServerState]);

  const getRegistration = async () => navigator.serviceWorker?.ready;

  const getActiveSubscription = useCallback(async () => {
    if (!supported) return null;
    try {
      const reg = await getRegistration();
      return await reg.pushManager.getSubscription();
    } catch {
      return null;
    }
  }, [supported]);

  const fetchPublicKey = async () => {
    const { publicKey } = await api.get("/api/notifications/push/public-key");
    return publicKey;
  };

  const enable = useCallback(async () => {
    if (!supported) {
      setMessage("Push notifications aren't supported in this browser. On iPhone, add the app to your Home Screen first.");
      return false;
    }
    setBusy(true);
    setMessage("");
    try {
      let sub;
      const reg = await getRegistration();

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm === "denied") {
        setMessage("Notifications are blocked. Enable them in your browser settings, then try again.");
        return false;
      }
      if (perm === "granted") {
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          sub = existing;
        } else {
          const publicKey = urlBase64ToUint8Array(await fetchPublicKey());
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: publicKey,
          });
        }
      }

      if (sub) {
        await api.post("/api/notifications/push/subscribe", {
          endpoint: sub.endpoint,
          keys: {
            p256dh: btoa(
              String.fromCharCode(...new Uint8Array(sub.getKey("p256dh"))),
            ),
            auth: btoa(
              String.fromCharCode(...new Uint8Array(sub.getKey("auth"))),
            ),
          },
        });
        setEnabled(true);
        return true;
      }
      return false;
    } catch (err) {
      if (err instanceof ApiError && err.code === "PUSH_NOT_CONFIGURED") {
        setMessage("Push isn't configured on this server yet.");
      } else {
        setMessage(
          err?.message || "Couldn't enable push notifications. Try again.",
        );
      }
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported]);

  const disable = useCallback(async () => {
    if (!supported) return setEnabled(false);
    setBusy(true);
    setMessage("");
    try {
      const sub = await getActiveSubscription();
      if (sub) {
        try {
          await api.raw("/api/notifications/push/unsubscribe", {
            method: "DELETE",
            body: { endpoint: sub.endpoint },
          });
        } catch {
          // even if the server call fails, drop the local subscription
        }
        try {
          await sub.unsubscribe();
        } catch {
          // ignore
        }
      } else {
        try {
          await api.raw("/api/notifications/push/unsubscribe", {
            method: "DELETE",
            body: { endpoint: "" },
          });
        } catch {
          // ignore
        }
      }
      setEnabled(false);
    } finally {
      setBusy(false);
    }
  }, [supported, getActiveSubscription]);

  const sendTest = useCallback(async () => {
    if (!enabled) {
      setMessage("Enable notifications first, then test.");
      return null;
    }
    setBusy(true);
    setMessage("");
    try {
      const res = await api.post("/api/notifications/push/test", {});
      setMessage(res.message || "Test notification sent.");
      return res;
    } catch (err) {
      setMessage(err?.message || "Test notification failed.");
      return null;
    } finally {
      setBusy(false);
    }
  }, [enabled]);

  return {
    supported,
    permission,
    enabled,
    busy,
    message,
    refresh: pollServerState,
    enable,
    disable,
    sendTest,
  };
}