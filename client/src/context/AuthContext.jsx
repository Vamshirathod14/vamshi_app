import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      const data = await api.get("/api/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
    const onLoggedOut = () => setUser(null);
    window.addEventListener("vault:logged-out", onLoggedOut);
    return () => window.removeEventListener("vault:logged-out", onLoggedOut);
  }, [loadMe]);

  const login = useCallback(async (email, password) => {
    const data = await api.post("/api/auth/login", { email, password });
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await api.post("/api/auth/register", { name, email, password });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {}
    setUser(null);
  }, []);

  const updateMe = useCallback(async (patch) => {
    const data = await api.patch("/api/users/profile", patch);
    setUser(data.user);
    return data.user;
  }, []);

  const value = { user, loading, setUser, login, register, logout, updateMe, reload: loadMe };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}