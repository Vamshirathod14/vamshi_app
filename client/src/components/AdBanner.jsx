import { useEffect, useRef } from "react";

// Google AdSense banner. The publisher ID is baked in as a default (it's not
// secret — it ships in every ad request) but can be overridden per build via
// VITE_ADSENSE_CLIENT. Slot ids come from AdSense > Ads > Ad units.
const CLIENT_ID =
  import.meta.env.VITE_ADSENSE_CLIENT || "ca-pub-5290892277325184";

let scriptInjected = false;

export function enableAdSense() {
  const existing =
    document.querySelector(
      'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]',
    ) || document.getElementById("adsense-js");
  if (existing || scriptInjected) return;
  scriptInjected = true;
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
    const idle = requestAnimationFrame(() => {
      if (!pushedRef.current) {
        pushedRef.current = true;
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {
          // noop — AdSense script may not have loaded yet
        }
      }
    });
    return () => cancelAnimationFrame(idle);
  }, [slot]);

  if (!slot) return null;

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