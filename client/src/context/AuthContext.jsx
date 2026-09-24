import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { api, refreshSession } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const genRef = useRef(0);

  const loadMe = useCallback(async () => {
    const gen = genRef.current;
    try {
      const data = await api.get("/api/auth/me");
      if (gen !== genRef.current) return;
      setUser(data.user);
    } catch {
      // Access token expired — try the long-lived refresh cookie so a
      // returning user is silently logged back in (no login screen).
      const restored = await refreshSession();
      if (gen !== genRef.current) return;
      setUser(restored);
    } finally {
      if (gen === genRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
    const onLoggedOut = () => {
      genRef.current += 1;
      setUser(null);
    };
    window.addEventListener("vault:logged-out", onLoggedOut);
    return () => window.removeEventListener("vault:logged-out", onLoggedOut);
  }, [loadMe]);

  const login = useCallback(async (email, password) => {
    const data = await api.post("/api/auth/login", { email, password });
    genRef.current += 1;
    setLoading(false);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await api.post("/api/auth/register", { name, email, password });
    genRef.current += 1;
    setLoading(false);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {}
    genRef.current += 1;
    setUser(null);
  }, []);

  const updateMe = useCallback(async (patch) => {
    const data = await api.patch("/api/users/profile", patch);
    genRef.current += 1;
    setUser(data.user);
    return data.user;
  }, []);

  const value = { user, loading, setUser, login, register, logout, updateMe, reload: loadMe };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}