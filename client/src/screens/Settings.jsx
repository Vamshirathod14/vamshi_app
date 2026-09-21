import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, LogOut, Trash2 } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { usePushNotifications } from "../hooks/usePushNotifications.js";
import Layout from "../components/Layout.jsx";
import { Field, Button, Segmented, Switch, Modal } from "../components/UI.jsx";

const THEMES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const ALL_PREFS_ON = {
  taskReminders: true,
  generalReminders: true,
  budgetAlerts: true,
  paymentAlerts: true,
  goalMilestones: true,
  summary: true,
};

export default function Settings() {
  const navigate = useNavigate();
  const { user, updateMe, logout } = useAuth();
  const { push } = useToast();
  const pushHook = usePushNotifications();
  const [name, setName] = useState(user.name || "");
  const [currency, setCurrency] = useState(user.currency || "INR");
  const [saving, setSaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwCur, setPwCur] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delPassword, setDelPassword] = useState("");
  const [delLoading, setDelLoading] = useState(false);

  async function saveProfile() {
    setSaving(true);
    try {
      await updateMe({ name });
      push("Profile saved.", "success");
    } catch (err) {
      push(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function saveTheme(t) {
    try {
      await updateMe({ theme: t });
      const root = document.documentElement;
      if (t === "dark") root.dataset.theme = "dark";
      else if (t === "system") delete root.dataset.theme;
      else root.dataset.theme = "light";
    } catch (err) {
      push(err.message, "error");
    }
  }

  async function saveCurrency(c) {
    try {
      await updateMe({ currency: c });
    } catch (err) {
      push(err.message, "error");
    }
  }

  async function toggleAllNotifications(on) {
    if (on) {
      try {
        await updateMe({ notificationsEnabled: true, notificationPrefs: ALL_PREFS_ON });
      } catch (err) {
        push(err.message, "error");
        return;
      }
      await pushHook.enable();
    } else {
      await pushHook.disable();
      try {
        await updateMe({ notificationsEnabled: false });
      } catch (err) {
        push(err.message, "error");
      }
    }
    pushHook.refresh();
  }

  const notificationsOn = user.notificationsEnabled !== false;

  async function changePassword() {
    if (pwNew.length < 6) {
      push("New password must be at least 6 characters.", "error");
      return;
    }
    setPwLoading(true);
    try {
      await api.patch("/api/auth/password", { currentPassword: pwCur, newPassword: pwNew });
      push("Password updated.", "success");
      setPwOpen(false);
      setPwCur("");
      setPwNew("");
    } catch (err) {
      push(err.message, "error");
    } finally {
      setPwLoading(false);
    }
  }

  async function deleteAccount() {
    setDelLoading(true);
    try {
      await api.raw("/api/users/account", { method: "DELETE", body: { password: delPassword } });
      push("Account deleted.", "success");
      setUser(null);
    } catch (err) {
      push(err.message || "Could not delete account.", "error");
    } finally {
      setDelLoading(false);
    }
  }

  return (
    <Layout onOpenAdd={() => {}}>
      <div className="page">
        <div className="screen-head">
          <button className="back" onClick={() => navigate("/more")}>
            <ChevronLeft size={18} /> More
          </button>
          <h1 className="screen-title">Settings</h1>
        </div>

        <div className="group-label">Profile</div>
        <div className="list-card" style={{ padding: 16 }}>
          <Field label="Name">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </Field>
          <Button variant="btn-outline btn-sm" onClick={saveProfile} loading={saving}>Save name</Button>
          <div className="small muted" style={{ marginTop: 12 }}>Signed in as {user.email}</div>
        </div>

        <div className="group-label">Appearance</div>
        <div className="list-card" style={{ padding: 16 }}>
          <Field label="Theme">
            <Segmented options={THEMES} value={user.theme || "light"} onChange={saveTheme} />
          </Field>
          <Field label="Currency">
            <Segmented
              options={[
                { value: "INR", label: "₹ INR" },
                { value: "USD", label: "$ USD" },
                { value: "EUR", label: "€ EUR" },
              ]}
              value={user.currency || "INR"}
              onChange={saveCurrency}
            />
          </Field>
        </div>

        <div className="group-label">Notifications</div>
        <div className="list-card" style={{ padding: "6px 16px 16px" }}>
          <div className="set-row" style={{ borderBottom: "1px solid var(--border)" }}>
            <span style={{ flex: 1, fontWeight: 600 }}>Enable notifications</span>
            <Switch checked={notificationsOn} onChange={toggleAllNotifications} />
          </div>
          <p className="small muted" style={{ margin: "10px 0 0" }}>
            {!pushHook.supported
              ? "Push isn't supported in this browser. On iPhone, add the app to your Home Screen first."
              : pushHook.enabled
                ? "You're receiving on this device — reminders arrive even when Vamshi is closed."
                : "Device delivery is off for this browser. Turn it on below to get reminders when Vamshi is closed."}
          </p>
          {pushHook.message && (
            <p className="small" style={{ margin: "8px 0 0", color: "var(--accent)" }}>{pushHook.message}</p>
          )}
          {pushHook.supported && notificationsOn && !pushHook.enabled && (
            <Button variant="btn-primary btn-sm" style={{ marginTop: 12 }} onClick={pushHook.enable} loading={pushHook.busy}>
              Turn on device notifications
            </Button>
          )}
          {pushHook.enabled && (
            <Button variant="btn-outline btn-sm" style={{ marginTop: 12 }} onClick={pushHook.sendTest} loading={pushHook.busy}>
              Test notification
            </Button>
          )}
        </div>

        <div className="group-label">Security</div>
        <div className="list-card" style={{ padding: "4px 16px" }}>
          <button className="set-row" onClick={() => setPwOpen(true)}>Change password</button>
          <button className="set-row" onClick={() => { logout(); navigate("/"); }} style={{ color: "var(--red)" }}>
            <LogOut size={16} /> Sign out
          </button>
        </div>

        <div className="group-label">Danger zone</div>
        <div className="list-card" style={{ padding: "4px 16px" }}>
          <button className="set-row" onClick={() => setDelOpen(true)} style={{ color: "var(--red)" }}>
            <Trash2 size={16} /> Delete my account
          </button>
        </div>
      </div>

      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Change password">
        <Field label="Current password">
          <input className="input" type="password" value={pwCur} onChange={(e) => setPwCur(e.target.value)} />
        </Field>
        <Field label="New password">
          <input className="input" type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} />
        </Field>
        <Button className="btn-block" variant="btn-primary" onClick={changePassword} loading={pwLoading}>Update password</Button>
      </Modal>

      <Modal open={delOpen} onClose={() => setDelOpen(false)} title="Delete your account?" sub="This permanently erases all your data. Enter your password to confirm.">
        <Field label="Password">
          <input className="input" type="password" value={delPassword} onChange={(e) => setDelPassword(e.target.value)} />
        </Field>
        <Button className="btn-block" variant="btn-danger" onClick={deleteAccount} loading={delLoading}>Delete account</Button>
      </Modal>
    </Layout>
  );
}

function SwitchRow({ label, value, onChange, last }) {
  return (
    <div className="set-row" style={{ borderBottom: last ? "none" : "1px solid var(--border)" }}>
      <span style={{ flex: 1 }}>{label}</span>
      <Switch checked={value} onChange={onChange} />
    </div>
  );
}