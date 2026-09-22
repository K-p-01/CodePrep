import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "../state/authStore.jsx";

export default function AuthPage() {
  const { isAuthenticated, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState(location.pathname.includes("register") ? "register" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "register") await register(name, email, password);
      else await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand"><GraduationCap size={24} /><strong>CodePrep</strong></div>
        <span className="eyebrow">Your placement workspace</span>
        <h2>{mode === "login" ? "Welcome back" : "Create your CodePrep account"}</h2>
        <p>Save your roadmap progress across sessions and keep your preparation connected to one account.</p>
        <form onSubmit={submit} className="auth-form">
          {mode === "register" && (
            <label>Name<input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} /></label>
          )}
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} /></label>
          {error && <div className="auth-error">{error}</div>}
          <button className="primary-button" disabled={busy}>{mode === "login" ? <LogIn size={17} /> : <UserPlus size={17} />}{busy ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}</button>
        </form>
        <button className="link-button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "Need an account? Create one" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}

