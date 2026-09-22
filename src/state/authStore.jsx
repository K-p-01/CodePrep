import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api.js";

const TOKEN_KEY = "codeprep-auth-token";
const USER_KEY = "codeprep-auth-user";
const AuthContext = createContext(null);

function readUser() {
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persist(result) {
  window.localStorage.setItem(TOKEN_KEY, result.token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(result.user));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser);
  const [loading, setLoading] = useState(Boolean(window.localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    const onUserUpdated = (event) => {
      if (!event.detail) return;
      setUser(event.detail);
      window.localStorage.setItem(USER_KEY, JSON.stringify(event.detail));
    };
    window.addEventListener("codeprep:user-updated", onUserUpdated);
    return () => window.removeEventListener("codeprep:user-updated", onUserUpdated);
  }, []);

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }

    api.me()
      .then((result) => {
        setUser(result.user);
        window.localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      })
      .catch(() => {
        window.localStorage.removeItem(TOKEN_KEY);
        window.localStorage.removeItem(USER_KEY);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const result = await api.login({ email, password });
    persist(result);
    setUser(result.user);
    return result.user;
  }

  async function register(name, email, password) {
    const result = await api.register({ name, email, password });
    persist(result);
    setUser(result.user);
    return result.user;
  }

  function updateUser(nextUser) {
    setUser(nextUser);
    window.localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  }

  function logout() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  const value = { user, loading, isAuthenticated: Boolean(user), login, register, updateUser, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

