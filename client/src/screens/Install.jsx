import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Download, Smartphone, Share, Chrome } from "lucide-react";
import { Button, Chip } from "../components/UI.jsx";

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [standalone, setStandalone] = useState(false);
  const ios = isIOS();

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    setStandalone(mq.matches);

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  async function promptInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") setDeferredPrompt(null);
  }

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
            Vamshi is already running as an installed app on this device.
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
          <div style={{ fontWeight: 650, fontSize: 15.5 }}>Vamshi works best from your home screen</div>
        </div>
        <p className="small muted" style={{ marginTop: 4 }}>
          Install Vamshi like a real app — it opens full-screen, offline-ready and
          works exactly like a native app. It's free.
        </p>
        {deferredPrompt ? (
          <Button className="btn-block" variant="btn-primary" style={{ marginTop: 12 }} onClick={promptInstall}>
            <Download size={16} /> Install Vamshi
          </Button>
        ) : (
          <Chip variant="accent">Installed app available for this browser</Chip>
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
              <div className="small muted">Confirm in the top-right. Vamshi's icon appears on your home screen.</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="install-steps">
          <div className="group-label">On Android</div>
          <div className="step-card">
            <div className="step-num">1</div>
            <div className="step-body">
              <div className="step-title">Open Chrome</div>
              <div className="small muted">Use the Chrome browser and open Vamshi.</div>
            </div>
          </div>
          <div className="step-card">
            <div className="step-num">2</div>
            <div className="step-body">
              <div className="step-title">Tap the menu</div>
              <div className="small muted">Tap the <Chrome size={13} style={{ verticalAlign: "-2px" }} /> menu (three dots, top-right).</div>
            </div>
          </div>
          <div className="step-card">
            <div className="step-num">3</div>
            <div className="step-body">
              <div className="step-title">Add to Home screen</div>
              <div className="small muted">Tap <b>Add to Home screen</b> → <b>Add</b>.</div>
            </div>
          </div>
        </div>
      )}

      <p className="small muted" style={{ textAlign: "center", marginTop: 16 }}>
        Stay logged in — your data lives securely on Vamshi.
      </p>
    </div>
  );
}