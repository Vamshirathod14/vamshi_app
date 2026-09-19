import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Button, Field } from "../components/UI.jsx";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { push } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const n = name.trim();
    const em = email.trim().toLowerCase();

    if (!n || !em || !password || !confirm) {
      push("Please fill in all fields.", "error");
      return;
    }
    if (!EMAIL_RE.test(em)) {
      push("Please enter a valid email address.", "error");
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
      const user = await register(n, em, password);
      push(`Welcome, ${user.name.split(" ")[0]}!`, "success");
      // New accounts are not subscribed yet.
      navigate("/", { replace: true });
    } catch (err) {
      push(err.message || "Registration failed.", "error");
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
        <h2>Create your account</h2>
        <p className="auth-sub">Your private financial companion</p>
        <form onSubmit={handleSubmit}>
          <Field label="Full name">
            <input
              className="input"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
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
          <Field label="Password">
            <input
              className="input"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm password">
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
            Create account
          </Button>
        </form>
        <p className="auth-agree small muted">
          By creating an account you agree to our <Link to="/terms">Terms &amp; Conditions</Link>
          <span className="sep">|</span>
          <Link to="/privacy-policy">Privacy Policy</Link>
        </p>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}