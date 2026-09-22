import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Trash2, CheckCheck } from "lucide-react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import { usePushNotifications } from "../hooks/usePushNotifications.js";
import Layout from "../components/Layout.jsx";
import { EmptyState, Skeleton } from "../components/UI.jsx";
import { timeAgo } from "../utils/format.js";

const TYPE_ICONS = {
  task: "📋",
  reminder: "⏰",
  payment: "💳",
  recurring: "🔁",
  budget: "🎯",
  goal: "🎯",
  summary: "📊",
  system: "ℹ️",
};
const severityIcon = (sev) =>
  sev === "danger" || sev === "critical" ? "⛔" : sev === "warning" ? "⚠️" : sev === "success" ? "✅" : "";
const iconOf = (n) => severityIcon(n.severity) || TYPE_ICONS[n.type] || "ℹ️";

export default function Notifications() {
  const navigate = useNavigate();
  const { push } = useToast();
  const pushHook = usePushNotifications();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/api/notifications");
      setItems(data.notifications);
      setUnread(data.unread);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markAll() {
    try {
      await api.patch("/api/notifications/read");
      setItems((xs) => xs.map((x) => ({ ...x, read: true })));
      setUnread(0);
    } catch (err) {
      push(err.message, "error");
    }
  }

  async function markOne(n) {
    if (n.read) return;
    setItems((xs) => xs.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await api.patch(`/api/notifications/${n._id}/read`);
    } catch {
      load();
    }
  }

  async function remove(n) {
    setItems((xs) => xs.filter((x) => x._id !== n._id));
    if (!n.read) setUnread((u) => Math.max(0, u - 1));
    try {
      await api.del(`/api/notifications/${n._id}`);
    } catch (err) {
      push(err.message, "error");
      load();
    }
  }

  async function clearSessions() {
    try {
      await api.post("/api/notifications/sessions/clear");
      push("All other sessions signed out.", "success");
    } catch (err) {
      push(err.message, "error");
    }
  }

  return (
    <Layout onOpenAdd={() => {}}>
      <div className="page">
        <div className="screen-head">
          <button className="back" onClick={() => navigate("/more")}>
            <ChevronLeft size={18} /> More
          </button>
          <h1 className="screen-title">Notifications</h1>
          {unread > 0 && (
            <button className="icon-btn" onClick={markAll} aria-label="Mark all read" title="Mark all as read">
              <CheckCheck size={17} />
            </button>
          )}
        </div>

        {unread > 0 && <button className="small muted" style={{ marginBottom: 14 }} onClick={markAll}>Mark all as read</button>}

        {pushHook.supported && !pushHook.enabled && (
          <div className="list-card" style={{ padding: 16, marginBottom: 14 }}>
            <div style={{ fontWeight: 600 }}>🔔 Enable device notifications</div>
            <p className="small muted" style={{ margin: "6px 0 12px" }}>
              Get reminders and task alerts on this device even when Liv is closed.
            </p>
            <button
              className="btn btn-primary btn-sm"
              disabled={pushHook.busy}
              style={{ border: "none", cursor: "pointer" }}
              onClick={async () => {
                const ok = await pushHook.enable();
                if (ok) push("Notifications enabled on this device.", "success");
              }}
            >
              {pushHook.busy ? "Turning on…" : "Turn on"}
            </button>
            {pushHook.message && (
              <div className="small" style={{ marginTop: 8, color: "var(--accent)" }}>
                {pushHook.message}
              </div>
            )}
          </div>
        )}

        {pushHook.supported && pushHook.enabled && (
          <div className="list-card" style={{ padding: 16, marginBottom: 14 }}>
            <div style={{ fontWeight: 600 }}>🔔 Device notifications on</div>
            <p className="small muted" style={{ margin: "5px 0 12px" }}>
              This device will get reminders and task alerts even when the app is
              closed. No popup during tests? Check System Settings → Notifications
              → Google Chrome (allow notifications) and make sure Focus/DND is off.
            </p>
          </div>
        )}

        {loading ? (
          <Skeleton lines={8} />
        ) : items.length === 0 ? (
          <EmptyState emoji="🔕" title="No notifications" sub="Budget alerts, task reminders and goal milestones will show up here." />
        ) : (
          <div className="list-card">
            {items.map((n) => (
              <button key={n._id} className={`list-row notif-row ${n.read ? "" : "unread"}`} onClick={() => markOne(n)}>
                <div className="set-ico" style={{ minWidth: 36, height: 36 }}>{iconOf(n)}</div>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ fontWeight: n.read ? 500 : 650 }}>
                    {n.title || n.message}
                    {n.body ? <span className="small muted"> — {n.body}</span> : null}
                  </div>
                  <div className="l-sub">{timeAgo(n.deliveredAt)}</div>
                </div>
                <span onClick={(e) => { e.stopPropagation(); remove(n); }} className="icon-btn" style={{ width: 30, height: 30 }} aria-label="Dismiss">
                  <Trash2 size={14} style={{ color: "var(--fg-tertiary)" }} />
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="group-label">Sessions</div>
        <p className="small muted" style={{ marginTop: 4 }}>
          Signed in on multiple devices? You can sign out everywhere except this one.
        </p>
        <button className="link-btn" onClick={clearSessions}>Sign out all other sessions</button>

        <div className="group-label">Debug</div>
        <p className="small muted" style={{ marginTop: 4 }}>
          Push isn't arriving? Tap below — a diagnostic summary is copied to
          your clipboard. Paste it into your support chat.
        </p>
        <button
          className="link-btn"
          onClick={async () => {
            try {
              const d = await api.get("/api/notifications/push/diag");
              const text = JSON.stringify(d, null, 2);
              try {
                await navigator.clipboard.writeText(text);
                push("Diagnostics copied — paste them here.", "success");
              } catch {
                push(text, "success");
              }
            } catch (err) {
              push(err.message, "error");
            }
          }}
        >
          Diagnose push
        </button>
      </div>
    </Layout>
  );
}