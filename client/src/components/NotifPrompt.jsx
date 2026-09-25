import { useState } from "react";
import { BellRing, X } from "lucide-react";
import { usePushNotifications } from "../hooks/usePushNotifications.js";

// Vamshi-specific first-run flag.
// The old "liv-notif-asked" key is migrated safely so existing users
// are never re-prompted.
const KEY = "vamshi-notif-asked";
const LEGACY_KEY = "liv-notif-asked";

// Migrate the legacy key on first load (one-time, harmless).
try {
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy != null && !localStorage.getItem(KEY)) {
    localStorage.setItem(KEY, legacy);
    localStorage.removeItem(LEGACY_KEY);
  }
} catch {
  // ignore
}

// First-run prompt: ask for notification permission exactly once (like
// the big apps do on first open). Later means "never ask again on
// startup" — users can still switch notifications on inside the
// Notifications screen.
export default function NotifPrompt() {
  const { supported, permission, enable } = usePushNotifications();
  const [visible, setVisible] = useState(() => {
    try {
      return !localStorage.getItem(KEY);
    } catch {
      return true;
    }
  });

  if (!visible || !supported || permission !== "default") return null;

  function respond(allow) {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
    if (allow) enable();
  }

  return (
    <div className="install-banner" style={{ borderLeft: "3px solid var(--violet)" }}>
      <span className="install-banner-text">
        <b>Get reminders on your phone</b> — bill dues, task alarms & savings
        nudges, even when the app is closed.
      </span>
      <button className="btn btn-primary" onClick={() => respond(true)}>
        <BellRing size={15} /> Allow
      </button>
      <button
        className="icon-btn"
        onClick={() => respond(false)}
        aria-label="Later"
        style={{ background: "transparent", color: "inherit" }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
