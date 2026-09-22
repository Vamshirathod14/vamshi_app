import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import { Button, Field } from "../components/UI.jsx";

export default function ForgotPassword() {
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) {
      push("Enter your account email.", "error");
      return;
    }
    setLoading(true);
    try {
      const data = await api.post("/api/auth/forgot-password", { email });
      push(data.message || "Check your email for the reset link.", "success");
      setSent(true);
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
          <h1>Liv</h1>
        </div>
        <h2>Forgot your password?</h2>
        <p className="auth-sub">
          {sent
            ? "If an account exists for that email, the reset link is on its way. It expires in 30 minutes."
            : "Tell us your account email and we'll send you a link to set a new password."}
        </p>
        {!sent && (
          <form onSubmit={handleSubmit}>
            <Field label="Email">
              <input
                className="input"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Button className="btn-block" type="submit" loading={loading} variant="btn-primary">
              Send Reset Link
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