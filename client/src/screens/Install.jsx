import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Download, Smartphone, Share, Chrome, MonitorDown } from "lucide-react";
import { Button, Chip } from "../components/UI.jsx";
import { useInstallPrompt } from "../hooks/useInstallPrompt.js";

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export default function Install() {
  const navigate = useNavigate();
  const { deferredPrompt, promptInstall, standalone } = useInstallPrompt();
  const ios = isIOS();

  if (standalone) {
    return (
      <div className="page">
        <div className="screen-head">
          <button className="back" onClick={() => navigate("/more")}>
            <ChevronLeft size={18} /> Back
          </button>
          <h1 className="screen-title">Install app</h1>
        </div>
        <div className="card" style={{ padding: 24, textAlign: "center" }}>
          <div className="empty-icon">🎉</div>
          <h3>You're all set!</h3>
          <p className="small muted">
            Liv is already running as an installed app on this device.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="screen-head">
        <button className="back" onClick={() => navigate("/more")}>
          <ChevronLeft size={18} /> Back
        </button>
        <h1 className="screen-title">Install app</h1>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div className="hstack" style={{ gap: 12, marginBottom: 6 }}>
          <div className="chip sm">
            <Smartphone size={16} />
          </div>
          <div style={{ fontWeight: 650, fontSize: 15.5 }}>Liv works best from your home screen</div>
        </div>
        <p className="small muted" style={{ marginTop: 4 }}>
          Install Liv like a real app — it opens full-screen, offline-ready and
          works exactly like a native app. It's free.
        </p>
        {deferredPrompt ? (
          <Button className="btn-block" variant="btn-primary" style={{ marginTop: 12 }} onClick={promptInstall}>
            <Download size={16} /> Install Liv
          </Button>
        ) : (
          <div style={{ marginTop: 12 }}>
            <Chip variant="accent">This browser doesn't show a one-tap install — use the steps below</Chip>
          </div>
        )}
      </div>

      {ios ? (
        <div className="install-steps">
          <div className="group-label">On iPhone / iPad</div>
          <div className="step-card">
            <div className="step-num">1</div>
            <div className="step-body">
              <div className="step-title">Open Safari</div>
              <div className="small muted">Tap <Share size={13} style={{ verticalAlign: "-2px" }} /> Share in the bottom toolbar.</div>
            </div>
          </div>
          <div className="step-card">
            <div className="step-num">2</div>
            <div className="step-body">
              <div className="step-title">Add to Home Screen</div>
              <div className="small muted">Scroll down the share sheet and tap <b>Add to Home Screen</b>.</div>
            </div>
          </div>
          <div className="step-card">
            <div className="step-num">3</div>
            <div className="step-body">
              <div className="step-title">Tap Add</div>
              <div className="small muted">Confirm in the top-right. Liv's icon appears on your home screen.</div>
            </div>
          </div>
        </div>
      ) : (
        <>
        <div className="install-steps">
          <div className="group-label">On Android</div>
          <div className="step-card">
            <div className="step-num">1</div>
            <div className="step-body">
              <div className="step-title">Open Chrome</div>
              <div className="small muted">Use the <b>Chrome</b> app and open <code>vamshi-app.onrender.com</code>.</div>
            </div>
          </div>
          <div className="step-card">
            <div className="step-num">2</div>
            <div className="step-body">
              <div className="step-title">Look for the install prompt</div>
              <div className="small muted">Chrome shows an <b>Install app</b> bar at the bottom, or an icon near the address bar — tap it and then <b>Install</b>.</div>
            </div>
          </div>
          <div className="step-card">
            <div className="step-num">3</div>
            <div className="step-body">
              <div className="step-title">No prompt? Use the menu</div>
              <div className="small muted">Tap the <Chrome size={13} style={{ verticalAlign: "-2px" }} /> ⋮ menu → <b>Install app</b> (recent Chrome) or <b>Add to Home screen</b> → <b>Add</b>.</div>
            </div>
          </div>
          <div className="step-card">
            <div className="step-num">4</div>
            <div className="step-body">
              <div className="step-title">Samsung Internet</div>
              <div className="small muted">Menu <b>☰</b> → <b>Add page to</b> → <b>Home screen</b> → <b>Add</b>. A shortcut is added even if your browser doesn't support the full app mode.</div>
            </div>
          </div>
          <div className="step-card">
            <div className="step-num">5</div>
            <div className="step-body">
              <div className="step-title">Still stuck?</div>
              <div className="small muted">Make sure you're on <b>https://</b>, update Chrome, and clear site data (site settings → clear) if you previously blocked it. Then reload and try again.</div>
            </div>
          </div>
        </div>

        <div className="install-steps">
          <div className="group-label">On Desktop (Chrome / Edge)</div>
          <div className="step-card">
            <div className="step-num">1</div>
            <div className="step-body">
              <div className="step-title">Open the website</div>
              <div className="small muted">Visit Liv in Chrome or Edge on your computer.</div>
            </div>
          </div>
          <div className="step-card">
            <div className="step-num">2</div>
            <div className="step-body">
              <div className="step-title">Click the install icon</div>
              <div className="small muted">The <MonitorDown size={13} style={{ verticalAlign: "-2px" }} /> install icon sits in the address bar — or ⋮ menu → <b>Install&nbsp;Liv</b>.</div>
            </div>
          </div>
          <div className="step-card">
            <div className="step-num">3</div>
            <div className="step-body">
              <div className="step-title">Click Install</div>
              <div className="small muted">Confirm and Liv opens in its own app window, ready offline.</div>
            </div>
          </div>
        </div>
        </>
      )}

      <p className="small muted" style={{ textAlign: "center", marginTop: 16 }}>
        Stay logged in — your data lives securely on Liv.
      </p>
    </div>
  );
}