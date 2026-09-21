import { useEffect, useRef, useState } from "react";
import { api } from "../api/client.js";

// Coordinates alarms announced by the service worker straight into this tab.
// The SW sends { type: "vamshi-alarm" } on every alarm-burst push it handles.
const ALARM_EVENT = "vamshi-alarm";

function startBeep() {
  // A loud, continuous synthesised siren (no audio file needed). Keeps
  // wailing until stopped — Dismiss silences it (and acks the server).
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const compressor = ctx.createDynamicsCompressor();
    compressor.connect(ctx.destination);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(compressor);
    osc.start();

    let freq = 900;
    let rising = true;
    const step = () => {
      freq = rising ? freq + 220 : freq - 220;
      rising = !rising;
      const t = ctx.currentTime;
      osc.frequency.setValueAtTime(freq, t);
      // Swell each half-second so it reads as a real alarm, not a ding.
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.45);
    };
    step();
    const interval = setInterval(step, 450);
    return { ctx, interval };
  } catch {
    return null;
  }
}

export default function AlarmSiren() {
  const [active, setActive] = useState(null); // { title, body }
  const ringingRef = useRef(null);

  useEffect(() => {
    const onMessage = (event) => {
      const data = event && event.data;
      if (!data || data.type !== ALARM_EVENT) return;
      setActive({
        title: data.title || "Vamshi reminder",
        body: data.body || "",
        referenceId: data.referenceId || null,
      });
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", onMessage);
      if (ringingRef.current) {
        clearInterval(ringingRef.current.interval);
        ringingRef.current.ctx.close().catch(() => {});
        ringingRef.current = null;
      }
    };
  }, []);

  function dismiss() {
    const ring = ringingRef.current;
    if (ring) {
      clearInterval(ring.interval);
      ring.ctx.close().catch(() => {});
      ringingRef.current = null;
    }
    const id = active && active.referenceId;
    setActive(null);
    if (id) {
      api.post("/api/notifications/push/ack-alarm", { reminderId: id }).catch(() => {});
    }
  }

  useEffect(() => {
    if (!active) {
      if (ringingRef.current) {
        clearInterval(ringingRef.current.interval);
        ringingRef.current.ctx.close().catch(() => {});
        ringingRef.current = null;
      }
      return;
    }
    if (!ringingRef.current) ringingRef.current = startBeep();
    // If the phone/browser suspended audio while another tab was focused,
    // unfurl it the moment the siren tab is visible again.
    const onVisible = () => {
      const ring = ringingRef.current;
      if (ring && document.visibilityState === "visible") {
        ring.ctx.resume().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [active]);

  if (!active) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "var(--accent)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 56, animation: "vamshi-pulse 1s infinite" }}>⏰</div>
      <h1 style={{ fontSize: 28, margin: 0 }}>{active.title.replace(/⏰.*$/, "").trim()}</h1>
      {active.body && <p style={{ fontSize: 16, opacity: 0.95, maxWidth: 420, margin: 0 }}>{active.body}</p>}
      <p style={{ fontSize: 13, opacity: 0.75, margin: 0 }}>Ringing every ~15s until you press Dismiss.</p>
      <button
        className="btn btn-lg"
        style={{ border: "2px solid #fff", color: "var(--accent)", background: "#fff", cursor: "pointer" }}
        onClick={dismiss}
      >
        Dismiss
      </button>
    </div>
  );
}