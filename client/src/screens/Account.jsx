import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, LogOut, UserRound, Download } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Button, Field, Modal, Chip } from "../components/UI.jsx";

export default function Account() {
  const navigate = useNavigate();
  const { user, updateMe, logout } = useAuth();
  const { push } = useToast();
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwCur, setPwCur] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed) return push("Name cannot be empty.", "error");
    setSaving(true);
    try {
      await updateMe({ name: trimmed });
      push("Profile updated.", "success");
    } catch (err) {
      push(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

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

  return (
    <>
      <div className="page">
        <div className="screen-head">
          <button className="back" onClick={() => navigate("/more")}>
            <ChevronLeft size={18} /> Back
          </button>
          <h1 className="screen-title">Account</h1>
        </div>

        {/* Profile */}
        <div className="group-label">Profile</div>
        <div className="list-card" style={{ padding: 16 }}>
          <div className="hstack" style={{ gap: 12, marginBottom: 14 }}>
            <div className="avatar-big">{user.name?.charAt(0)?.toUpperCase() || <UserRound size={20} />}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 650, fontSize: 16 }}>{user.name}</div>
              <div className="small muted">{user.email}</div>
              {user.role === "admin" && <Chip variant="accent">Admin</Chip>}
            </div>
          </div>
          <Field label="Display name">
            <input className="input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Button variant="btn-outline btn-sm" onClick={saveName} loading={saving}>
            Save name
          </Button>
          <Field label="Email (sign-in)">
            <input className="input" value={user.email} disabled />
          </Field>
        </div>

        {/* Plan */}
        <div className="group-label">Your plan</div>
        <div className="list-card" style={{ padding: "4px 16px" }}>
          <div className="set-row">
            <div style={{ flex: 1 }}>
              <div>Vamshi — Free</div>
              <div className="small muted">All features unlocked, no subscription.</div>
            </div>
            <Chip variant="green">Free</Chip>
          </div>
        </div>
        <Button className="btn-block" variant="btn-outline" onClick={() => navigate("/install")}>
          <Download size={16} /> Install Vamshi on your phone
        </Button>

        {/* Security */}
        <div className="group-label">Security</div>
        <div className="list-card" style={{ padding: "4px 16px" }}>
          <button className="set-row" onClick={() => setPwOpen(true)}>
            Change password
          </button>
          <button
            className="set-row"
            onClick={() => logout()}
            style={{ borderBottom: "none", color: "var(--red)" }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>

      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Change password">
        <Field label="Current password">
          <input className="input" type="password" autoComplete="current-password" value={pwCur} onChange={(e) => setPwCur(e.target.value)} />
        </Field>
        <Field label="New password">
          <input className="input" type="password" autoComplete="new-password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} />
        </Field>
        <Button className="btn-block" variant="btn-primary" onClick={changePassword} loading={pwLoading}>
          Update password
        </Button>
      </Modal>
    </>
  );
}