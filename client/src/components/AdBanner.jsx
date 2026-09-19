import { useEffect, useRef } from "react";

// Google AdSense banner. Disabled until you set VITE_ADSENSE_CLIENT at build
// time (see client/.env.example). When configured, the banner renders an
// auto-sized responsive ad unit using the given `slot` id.
const CLIENT_ID = import.meta.env.VITE_ADSENSE_CLIENT || "";

export function enableAdSense() {
  if (!CLIENT_ID) return;
  if (document.querySelector("#adsense-js")) return;
  const s = document.createElement("script");
  s.id = "adsense-js";
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT_ID}`;
  document.head.appendChild(s);
}

export function AdBanner({ slot }) {
  const pushedRef = useRef(false);
  useEffect(() => {
    if (!CLIENT_ID || !slot) return;
    enableAdSense();
    const idle = requestAnimationFrame(() => {
      if (!pushedRef.current) {
        pushedRef.current = true;
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {
          // noop
        }
      }
    });
    return () => cancelAnimationFrame(idle);
  }, [slot]);

  if (!CLIENT_ID || !slot) return null;

  return (
    <div className="ad-slot">
      <span className="ad-label">Advertisement</span>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}