import { useEffect, useRef, useState } from "react";
import { api } from "../api/client.js";

// Coordinates alarms announced by the service worker straight into this tab.
// The SW sends { type: "vamshi-alarm" } on every alarm-burst push it handles.
const ALARM_EVENT = "vamshi-alarm";

function startBeep() {
  // A small synthesised siren (no audio file needed). Repeats until stopped.
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const beep = () => {
      const t0 = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.12, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.5);
    };
    beep();
    const interval = setInterval(beep, 900);
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