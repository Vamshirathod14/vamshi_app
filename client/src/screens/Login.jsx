import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Button, Field } from "../components/UI.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { push } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      push("Please fill in all fields.", "error");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      push("Welcome back!", "success");
    } catch (err) {
      push(err.message || "Login failed.", "error");
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
        <h2>Welcome back</h2>
        <p className="auth-sub">Your private financial companion</p>
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
          <Field label="Password">
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button className="btn-block" type="submit" loading={loading} variant="btn-primary">
            Sign In
          </Button>
        </form>
        <p className="auth-switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </div>
  );
}