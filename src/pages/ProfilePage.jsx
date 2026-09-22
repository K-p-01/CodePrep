import { useState } from "react";
import { CheckCircle2, LogOut, Save, UserCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../state/authStore.jsx";
import { useProgress } from "../state/progressStore.js";

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const progressApi = useProgress();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveProfile(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await api.updateProfile({ name });
      updateUser(result.user);

      setMessage("Profile updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="stack">
      <section className="profile-hero">
        <div className="profile-avatar"><UserCircle2 size={52} /></div>
        <div><span className="eyebrow">Profile & Settings</span><h2>{user?.name}</h2><p>{user?.email} · {user?.role === "admin" ? "Administrator" : "Student"}</p></div>
      </section>

      <section className="content-section profile-form-section">
        <div className="section-title"><div><h2>Account details</h2><p>Keep your display name up to date.</p></div></div>
        <form className="profile-form" onSubmit={saveProfile}>
          <label>Full name<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={80} required /></label>
          <label>Email<input value={user?.email || ""} disabled /></label>
          {message ? <div className="success-message"><CheckCircle2 size={17} />{message}</div> : null}
          {error ? <div className="auth-error">{error}</div> : null}
          <button className="primary-button" disabled={busy}><Save size={17} />{busy ? "Saving..." : "Save profile"}</button>
        </form>
      </section>

      <section className="content-section profile-summary-grid">
        <div><span className="eyebrow">Account</span><strong>{user?.email}</strong><span>Signed-in identity</span></div>
        <div><span className="eyebrow">Progress sync</span><strong>{progressApi.syncStatus === "synced" ? "Synced" : progressApi.syncStatus}</strong><span>Cloud-backed learning progress</span></div>
        <div><span className="eyebrow">Saved items</span><strong>{progressApi.getBookmarks().length}</strong><span>Revision queue</span></div>
      </section>

      <section className="content-section danger-section">
        <div><span className="eyebrow">Session</span><h3>Sign out of CodePrep</h3><p>Your cloud progress remains attached to your account when you sign back in.</p></div>
        <button className="secondary-button" onClick={signOut}><LogOut size={16} />Log out</button>
      </section>
    </div>
  );
}

