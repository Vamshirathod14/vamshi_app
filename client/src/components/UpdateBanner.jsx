import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

function currentBuildHash() {
  try {
    const s = document.querySelector('script[src*="/assets/index-"]');
    const m = s?.getAttribute("src")?.match(/index-([A-Za-z0-9_-]+)\.js/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

async function fetchNewHash() {
  try {
    // Bypass caches so we see the freshly deployed index.html.
    const res = await fetch("/index.html", { cache: "no-store" });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/assets\/index-([A-Za-z0-9_-]+)\.js/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

// Tells users "we shipped new changes — tap to update" when a newer build is
// deployed while they have the app open (or cached). The version is the Vite
// content hash of the entry chunk, so every deploy bumps it automatically.
export default function UpdateBanner() {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    let alive = true;
    const check = async () => {
      const local = currentBuildHash();
      const remote = await fetchNewHash();
      if (!alive) return;
      if (local && remote && local !== remote) setStale(true);
    };
    check();
    const id = setInterval(check, 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!stale) return null;

  return (
    <div
      className="install-banner"
      style={{
        position: "sticky",
        top: 8,
        zIndex: 60,
        borderLeft: "3px solid var(--green)",
      }}
    >
      <span className="install-banner-text">
        <b>A new version of Liv is available</b> — refresh to see the latest
        changes.
      </span>
      <button className="btn btn-primary" onClick={() => location.reload()}>
        <RefreshCw size={15} /> Update
      </button>
      <button
        className="icon-btn"
        onClick={() => setStale(false)}
        aria-label="Later"
        style={{ background: "transparent", color: "inherit" }}
      >
        <X size={16} />
      </button>
    </div>
  );
}