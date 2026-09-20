import { useCallback, useEffect, useState } from "react";

// Captures the browser's PWA install prompt (beforeinstallprompt) and exposes a
// prompt() helper. Works on Android/desktop Chrome and Edge. Returns null when
// the browser doesn't support install (e.g. iOS Safari, which needs manual
// "Add to Home Screen").
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        // iOS home-screen apps
        (typeof navigator !== "undefined" &&
          (navigator.standalone || document.documentElement.hasAttribute("standalone"))),
    );
    const onPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => setDeferredPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
    return outcome === "accepted";
  }, [deferredPrompt]);

  return { deferredPrompt, promptInstall, standalone, dismiss: () => setDeferredPrompt(null) };
}