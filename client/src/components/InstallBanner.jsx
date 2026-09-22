import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import { useInstallPrompt } from "../hooks/useInstallPrompt.js";

const KEY = "liv-install-banner-dismissed";

export default function InstallBanner() {
  const { deferredPrompt, promptInstall, standalone } = useInstallPrompt();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (standalone || !deferredPrompt) return;
    if (localStorage.getItem(KEY)) return;
    setVisible(true);
  }, [deferredPrompt, standalone]);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(KEY, "1");
    setVisible(false);
  }

  async function install() {
    const ok = await promptInstall();
    if (ok) dismiss();
  }

  return (
    <div className="install-banner">
      <span className="install-banner-text">
        <b>Add Liv to your home screen</b> — it opens like a real app, full-screen & offline-ready.
      </span>
      <button className="btn btn-primary" onClick={install}>
        <Download size={15} /> Install
      </button>
      <button className="icon-btn" onClick={dismiss} aria-label="Dismiss" style={{ background: "transparent", color: "inherit" }}>
        <X size={16} />
      </button>
    </div>
  );
}