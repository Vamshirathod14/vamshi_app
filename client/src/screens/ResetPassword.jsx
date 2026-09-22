import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import { Button, Field } from "../components/UI.jsx";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { push } = useToast();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token) {
      push("This reset link is incomplete. Please request a new one.", "error");
      return;
    }
    if (password.length < 6) {
      push("Password must be at least 6 characters.", "error");
      return;
    }
    if (password !== confirm) {
      push("Passwords do not match.", "error");
      return;
    }
    setLoading(true);
    try {
      const data = await api.post("/api/auth/reset-password", { token, newPassword: password });
      push(data.message || "Password updated.", "success");
      setDone(true);
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      push(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-mark">V</div>
          <h1>Vamshi</h1>
        </div>
        <h2>Choose a new password</h2>
        <p className="auth-sub">
          {done
            ? "Your password has been updated — signing you in shortly."
            : "Pick a strong password, then sign in with it."}
        </p>
        {!done && (
          <form onSubmit={handleSubmit}>
            <Field label="New password">
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Field label="Confirm new password">
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat your password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
            <Button className="btn-block" type="submit" loading={loading} variant="btn-primary">
              Update Password
            </Button>
          </form>
        )}
        <p className="auth-switch">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}