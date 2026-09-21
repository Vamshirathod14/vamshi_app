import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Pencil, Plus, Power, Send, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "../api/client.js";
import { Button, Field, Sheet, Switch, Skeleton, Chip } from "../components/UI.jsx";
import { formatDate, formatPaise, toDateInput } from "../utils/format.js";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "festivals", label: "Festivals" },
  { id: "messages", label: "Custom messages" },
  { id: "reminders", label: "Reminders" },
];

const statusVariant = (s) =>
  s === "active" ? "green" : s === "expired" || s === "cancelled" ? "amber" : s === "pending" ? "amber" : "neutral";

function TabBar({ active, onNavigate }) {
  return (
    <div className="admin-tabs">
      {TABS.map((t) => (
        <button key={t.id} className={t.id === active ? "active" : ""} onClick={() => onNavigate(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");

  if (tab === "festivals") return <Festivals onNavigate={setTab} />;
  if (tab === "messages") return <MessageBroadcast onNavigate={setTab} />;
  if (tab === "reminders") return <UserReminders onNavigate={setTab} />;
  return <Overview navigate={navigate} onNavigate={setTab} />;
}

function Overview({ navigate, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.get("/api/admin/stats");
        if (alive) setStats(data);
      } catch (err) {
        if (alive) setError(err.message || "Could not load admin data.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const tiles = stats
    ? [
        { label: "Total users", value: stats.totalUsers },
        { label: "Active subscriptions", value: stats.activeSubscriptions, tone: "green" },
        { label: "Pending payments", value: stats.pendingCount, tone: "amber" },
        { label: "Inactive", value: stats.inactiveCount },
        { label: "Expired", value: stats.expiredCount, tone: "amber" },
        { label: "Cancelled", value: stats.cancelledCount, tone: "red" },
      ]
    : [];

  return (
    <div className="page">
      <div className="screen-head">
        <button className="back" onClick={() => navigate("/more")}>
          <ChevronLeft size={18} /> More
        </button>
        <h1 className="screen-title">Admin</h1>
      </div>

      <TabBar active="overview" onNavigate={onNavigate} />

      {error ? (
        <div className="empty" style={{ padding: "24px 16px" }}>
          <div className="empty-icon">🔒</div>
          <h3>Not allowed</h3>
          <p>{error}</p>
        </div>
      ) : !stats ? (
        <Skeleton lines={6} />
      ) : (
        <>
          <div className="admin-grid">
            {tiles.map((t) => (
              <div key={t.label} className="card admin-tile">
                <div className="stat-val" style={t.tone ? { color: `var(--${t.tone})` } : undefined}>
                  {t.value}
                </div>
                <div className="stat-lab">{t.label}</div>
              </div>
            ))}
          </div>

          <div className="group-label" style={{ marginTop: 0 }}>Revenue</div>
          <div className="card admin-tile revenue-tile">
            <div className="stat-val">{formatPaise(stats.revenue)}</div>
            <div className="stat-lab">Total collected from paid subscriptions</div>
          </div>

          <div className="group-label">Recent registrations</div>
          {stats.recentRegistrations.length === 0 ? (
            <div className="empty" style={{ padding: "20px 16px" }}>
              <h3>No users yet</h3>
            </div>
          ) : (
            <div className="list-card" style={{ padding: "4px 16px" }}>
              {stats.recentRegistrations.map((u) => (
                <div key={u._id} className="set-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div>{u.name}</div>
                    <div className="small muted">{u.email}</div>
                  </div>
                  <div className="small muted" style={{ marginRight: 8 }}>{formatDate(u.createdAt)}</div>
                  <Chip variant={statusVariant(u.subscriptionStatus)}>{u.subscriptionStatus}</Chip>
                </div>
              ))}
            </div>
          )}

          <div className="group-label">Recent payments</div>
          {stats.recentPayments.length === 0 ? (
            <div className="empty" style={{ padding: "20px 16px" }}>
              <h3>No payments yet</h3>
            </div>
          ) : (
            <div className="list-card" style={{ padding: "4px 16px" }}>
              {stats.recentPayments.map((p) => (
                <div key={p.id} className="set-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div>
                      {p.user ? p.user.name : "Deleted user"}
                      {p.promoCode ? <span className="promo-tag"> {p.promoCode}</span> : null}
                    </div>
                    <div className="small muted">{p.user ? p.user.email : ""} · {formatDate(p.createdAt)}</div>
                  </div>
                  <Chip variant={p.status === "paid" ? "green" : p.status === "failed" ? "red" : "amber"}>
                    {p.status}
                  </Chip>
                  <div className="small" style={{ fontWeight: 600, marginLeft: 10 }}>{formatPaise(p.finalAmount)}</div>
                </div>
              ))}
            </div>
          )}

          <div className="hstack" style={{ gap: 8, marginTop: 16, justifyContent: "center", color: "var(--fg-secondary)" }}>
            <ShieldCheck size={15} /> Server-protected · admins only
          </div>
        </>
      )}
    </div>
  );
}

const EMPTY_FEST = {
  date: toDateInput(new Date()),
  title: "",
  body: "",
  active: true,
};

function Festivals({ onNavigate }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FEST);
  const [saving, setSaving] = useState(false);

  async function load() {
    const data = await api.get("/api/admin/festivals");
    setItems(data.festivals);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.get("/api/admin/festivals");
        if (alive) setItems(data.festivals);
      } catch (err) {
        if (alive) setError(err.message || "Could not load festivals.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FEST);
    setFormOpen(true);
  }

  function openEdit(f) {
    setEditing(f);
    setForm({ date: f.date, title: f.title, body: f.body || "", active: f.active !== false });
    setFormOpen(true);
  }

  async function saveForm() {
    if (!form.title.trim() || !form.body.trim()) {
      window.alert("Both a title and a message are required.");
      return;
    }
    const body = { date: form.date, title: form.title.trim(), body: form.body.trim(), active: form.active };
    setSaving(true);
    try {
      if (editing) await api.patch(`/api/admin/festivals/${editing._id}`, body);
      else await api.post("/api/admin/festivals", body);
      setFormOpen(false);
      setSaving(false);
      await load();
    } catch (err) {
      setSaving(false);
      window.alert(err.message || "Could not save the festival/event.");
    }
  }

  async function toggleActive(f) {
    try {
      await api.patch(`/api/admin/festivals/${f._id}`, { active: !(f.active !== false) });
      await load();
    } catch (err) {
      window.alert(err.message || "Could not update the festival/event.");
    }
  }

  async function remove(f) {
    if (!window.confirm(`Delete "${f.title}"? It will no longer broadcast.`)) return;
    try {
      await api.del(`/api/admin/festivals/${f._id}`);
      await load();
    } catch (err) {
      window.alert(err.message || "Could not delete the festival/event.");
    }
  }

  return (
    <div className="page">
      <div className="screen-head">
        <button className="back" onClick={() => onNavigate("overview")}>
          <ChevronLeft size={18} /> Admin
        </button>
        <h1 className="screen-title">Festivals & events</h1>
      </div>

      <TabBar active="festivals" onNavigate={onNavigate} />

      <p className="small muted" style={{ margin: "12px 0" }}>
        Each day here is broadcast to every user with notifications on, at 9:00
        AM IST on that date. Deactivate any you don't want sent.
      </p>

      <div className="hstack" style={{ justifyContent: "space-between", margin: "12px 0" }}>
        <Button variant="btn-outline btn-sm" onClick={openCreate} icon={<Plus size={15} />}>
          New festival/event
        </Button>
      </div>

      {error ? (
        <div className="empty" style={{ padding: "24px 16px" }}>
          <div className="empty-icon">🔒</div>
          <h3>Not allowed</h3>
          <p>{error}</p>
        </div>
      ) : !items ? (
        <Skeleton lines={5} />
      ) : items.length === 0 ? (
        <div className="empty" style={{ padding: "24px 16px" }}>
          <div className="empty-icon">🎉</div>
          <h3>No festivals yet</h3>
          <p>Add a date with a greeting to send out an automatic push.</p>
        </div>
      ) : (
        <div className="list-card" style={{ padding: "4px 16px" }}>
          {items.map((f) => (
            <div key={f._id} className="set-row" style={{ alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="hstack" style={{ gap: 8, flexWrap: "wrap" }}>
                  <Chip variant={f.active !== false ? "green" : "neutral"}>{f.date}</Chip>
                  <span style={{ fontWeight: 700 }}>{f.title}</span>
                </div>
                <div className="small muted" style={{ marginTop: 2 }}>{f.body}</div>
              </div>
              <div className="hstack" style={{ gap: 6 }}>
                <button className="icon-btn" title="Edit" onClick={() => openEdit(f)}>
                  <Pencil size={15} />
                </button>
                <button className="icon-btn" title={f.active !== false ? "Deactivate" : "Activate"} onClick={() => toggleActive(f)}>
                  <Power size={15} />
                </button>
                <button className="icon-btn" title="Delete" style={{ color: "var(--red)" }} onClick={() => remove(f)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="hstack" style={{ gap: 8, marginTop: 16, justifyContent: "center", color: "var(--fg-secondary)" }}>
        <ShieldCheck size={15} /> Server-protected · admins only
      </div>

      <Sheet open={formOpen} onClose={() => setFormOpen(false)} title={editing ? `Edit ${editing.title}` : "New festival/event"}>
        <Field label="Date (IST)" hint="The push fires at 9:00 AM IST on this date.">
          <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Title">
          <input
            className="input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Happy Diwali! 🪔"
            maxLength={120}
          />
        </Field>
        <Field label="Message" hint="One short, warm English line — shown inside the push.">
          <textarea
            className="input"
            rows={3}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="e.g. Light, laughter and sweets — may your savings shine brightest."
            maxLength={500}
          />
        </Field>
        <Field label="Active">
          <Switch checked={form.active} onChange={(v) => setForm({ ...form, active: v })} />
        </Field>
        <div className="modal-actions">
          <Button variant="btn-outline" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button variant="btn-primary" onClick={saveForm} loading={saving}>
            {editing ? "Save changes" : "Add festival/event"}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function MessageBroadcast({ onNavigate }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    if (!title.trim() || !body.trim()) {
      window.alert("Give the message a title and some content.");
      return;
    }
    if (!window.confirm(`Send "${title.trim()}" to EVERY user right now?`)) return;
    setSending(true);
    try {
      const res = await api.post("/api/admin/broadcast", { title: title.trim(), body: body.trim() });
      setSending(false);
      window.alert(`Sent to ${res.recipients} user(s) — ${res.notified} device push(es).`);
      setTitle("");
      setBody("");
    } catch (err) {
      setSending(false);
      window.alert(err.message || "Could not send the message.");
    }
  }

  return (
    <div className="page">
      <div className="screen-head">
        <button className="back" onClick={() => onNavigate("overview")}>
          <ChevronLeft size={18} /> Admin
        </button>
        <h1 className="screen-title">Custom messages</h1>
      </div>

      <TabBar active="messages" onNavigate={onNavigate} />

      <p className="small muted" style={{ margin: "12px 0" }}>
        Write a message and hit send — it goes out immediately to every user
        with notifications on. Use for announcements, offers or updates.
      </p>

      <div className="list-card" style={{ padding: 16 }}>
        <Field label="Title">
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. New feature live! 🚀"
            maxLength={120}
          />
        </Field>
        <Field label="Message">
          <textarea
            className="input"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="e.g. Budget tracking just got smarter — check the new monthly summary in your app."
            maxLength={500}
          />
        </Field>
      </div>

      {(title.trim() || body.trim()) && (
        <>
          <div className="group-label" style={{ marginTop: 16 }}>Preview — how it will look</div>
          <div className="list-card" style={{ padding: 16, border: "1px solid var(--accent)" }}>
            <div style={{ fontWeight: 700 }}>{title.trim() || "Your title"}</div>
            <div className="small muted" style={{ marginTop: 4 }}>{body.trim() || "Your message…"}</div>
          </div>
        </>
      )}

      <Button
        className="btn-block"
        variant="btn-primary"
        style={{ marginTop: 16 }}
        onClick={send}
        loading={sending}
        icon={<Send size={15} />}
      >
        Send to all users
      </Button>

      <div className="hstack" style={{ gap: 8, marginTop: 16, justifyContent: "center", color: "var(--fg-secondary)" }}>
        <ShieldCheck size={15} /> Server-protected · admins only
      </div>
    </div>
  );
}

function UserReminders({ onNavigate }) {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.get("/api/admin/users");
        const sorted = [...data.users].sort(
          (a, b) => new Date(a.updatedAt) - new Date(b.updatedAt),
        );
        if (alive) setUsers(sorted);
      } catch (err) {
        if (alive) setError(err.message || "Could not load users.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function openUser(u) {
    setSelected(u);
    setTitle(`Hey ${(u.name || "there").split(" ")[0]}, we miss you!`);
    setBody("It's been a while since your last visit — your spending overview is waiting whenever you're ready.");
    setOpen(true);
  }

  async function send() {
    if (!title.trim() || !body.trim()) {
      window.alert("Give the reminder a title and some content.");
      return;
    }
    if (!window.confirm(`Send this to ${selected.name} right now?`)) return;
    setSending(true);
    try {
      const res = await api.post("/api/admin/broadcast/user", {
        userId: selected._id,
        title: title.trim(),
        body: body.trim(),
      });
      setSending(false);
      setOpen(false);
      window.alert(`Reminder sent to ${selected.name}${res.notified > 0 ? ` — ${res.notified} device push(es)` : " — device not reachable right now"}.`);
    } catch (err) {
      setSending(false);
      window.alert(err.message || "Could not send the reminder.");
    }
  }

  return (
    <div className="page">
      <div className="screen-head">
        <button className="back" onClick={() => onNavigate("overview")}>
          <ChevronLeft size={18} /> Admin
        </button>
        <h1 className="screen-title">Reminders</h1>
      </div>

      <TabBar active="reminders" onNavigate={onNavigate} />

      <p className="small muted" style={{ margin: "12px 0" }}>
        Tap a user (least active first) to send them a personal nudge — goes
        straight to their phone with a single click.
      </p>

      {error ? (
        <div className="empty" style={{ padding: "24px 16px" }}>
          <div className="empty-icon">🔒</div>
          <h3>Not allowed</h3>
          <p>{error}</p>
        </div>
      ) : !users ? (
        <Skeleton lines={6} />
      ) : users.length === 0 ? (
        <div className="empty" style={{ padding: "24px 16px" }}>
          <div className="empty-icon">👤</div>
          <h3>No users yet</h3>
        </div>
      ) : (
        <div className="list-card" style={{ padding: "4px 16px" }}>
          {users.map((u) => (
            <div
              key={u._id}
              className="set-row"
              style={{ alignItems: "center", gap: 10, cursor: "pointer" }}
              onClick={() => openUser(u)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="hstack" style={{ gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{u.name || "—"}</span>
                  {u.role === "admin" && <Chip variant="accent">Admin</Chip>}
                </div>
                <div className="small muted">{u.email}</div>
                <div className="small muted" style={{ marginTop: 2 }}>Last active {formatDate(u.updatedAt)}</div>
              </div>
              <Chip variant={statusVariant(u.subscriptionStatus)}>{u.subscriptionStatus}</Chip>
              <button className="icon-btn" title="Send reminder">
                <Send size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="hstack" style={{ gap: 8, marginTop: 16, justifyContent: "center", color: "var(--fg-secondary)" }}>
        <ShieldCheck size={15} /> Server-protected · admins only
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title={`Reminder — ${selected ? selected.name : ""}`}>
        <Field label="Title">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        </Field>
        <Field label="Message">
          <textarea
            className="input"
            rows={4}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="A short personal note for this user."
            maxLength={500}
          />
        </Field>
        <div className="modal-actions">
          <Button variant="btn-outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="btn-primary" onClick={send} loading={sending} icon={<Send size={15} />}>
            Send reminder
          </Button>
        </div>
      </Sheet>
    </div>
  );
}