import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { api, refreshSession } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // `checking` = session restoration in progress (show the splash/loading screen,
  // never the login screen while we are verifying the existing session).
  const [checking, setChecking] = useState(true);
  const genRef = useRef(0);

  // Restore the session once on mount, and again when the network returns.
  const restoreSession = useCallback(async () => {
    const gen = ++genRef.current;
    setChecking(true);
    try {
      const data = await api.get("/api/auth/me");
      if (gen !== genRef.current) return;
      setUser(data.user);                                   // 200 → authenticated
    } catch (err) {
      if (gen !== genRef.current) return;
      if (err.status === 401) {
        // Access token expired — try the long-lived refresh cookie.
        const restored = await refreshSession();
        if (gen !== genRef.current) return;
        setUser(restored);                                  // user obj → logged in, null → login
      }
      // else: network error (offline / server unreachable).  Do NOT log the
      // user out — keep the existing in-memory state and retry on reconnect.
    } finally {
      if (gen === genRef.current) setChecking(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();

    const onOnline = () => {
      // Revalidate once the device is back online.
      restoreSession();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [restoreSession]);

  const login = useCallback(async (email, password) => {
    const data = await api.post("/api/auth/login", { email, password });
    ++genRef.current;
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await api.post("/api/auth/register", { name, email, password });
    ++genRef.current;
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/api/auth/logout"); } catch {}
    ++genRef.current;
    setUser(null);
  }, []);

  const updateMe = useCallback(async (patch) => {
    const data = await api.patch("/api/users/profile", patch);
    ++genRef.current;
    setUser(data.user);
    return data.user;
  }, []);

  const value = { user, checking, setUser, login, register, logout, updateMe, reload: restoreSession };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
