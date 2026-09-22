import { useState } from "react";
import { Activity, BookMarked, BookOpen, CalendarDays, GraduationCap, LayoutDashboard, Map, Menu, Search, ShieldCheck, Target, UserCircle, X } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../state/authStore.jsx";
import { useContent } from "../state/contentStore.jsx";

const navItems = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Subjects", to: "/#subjects", icon: BookOpen },
  { label: "Roadmap", to: "/subjects/dsa", icon: Map },
  { label: "Practice", to: "/subjects/dsa/topics/arrays#practice", icon: Target },
  { label: "Analytics", to: "/analytics", icon: Activity },
  { label: "Search", to: "/search", icon: Search },
  { label: "Revision", to: "/revision", icon: BookMarked },
  { label: "Study Planner", to: "/planner", icon: CalendarDays },
];

export default function Layout() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const { source } = useContent();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-card">
          <div className="brand-mark">🎓</div>
          <strong>Loading CodePrep…</strong>
          <span>Restoring your study session</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Outlet />;

  return (
    <div className="app-shell">
      <button
        type="button"
        className={`mobile-backdrop ${mobileOpen ? "open" : ""}`}
        aria-label="Close navigation"
        onClick={closeMobile}
      />

      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-head">
          <NavLink to="/" className="brand" aria-label="CodePrep dashboard" onClick={closeMobile}>
            <div className="brand-mark"><GraduationCap size={24} /></div>
            <div><strong>CodePrep</strong><span>Placement Roadmaps</span></div>
          </NavLink>
          <button type="button" className="icon-button mobile-close" aria-label="Close menu" onClick={closeMobile}><X size={20} /></button>
        </div>

        <nav className="side-nav" aria-label="Primary navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.label} to={item.to} className="nav-item" onClick={closeMobile}>
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          {user?.role === "admin" ? (
            <NavLink to="/admin" className="nav-item" onClick={closeMobile}>
              <ShieldCheck size={18} />
              <span>Content Studio</span>
            </NavLink>
          ) : null}
        </nav>

        <div className="sidebar-footer">
          <div className={`catalog-status ${source === "database" ? "online" : "demo"}`}>
            <span className="status-dot" />
            <div>
              <strong>{source === "database" ? "Cloud catalog" : "Demo catalog"}</strong>
              <small>{source === "database" ? "Published content" : "Built-in fallback"}</small>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-main">
            <button type="button" className="mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
            <div>
              <span className="eyebrow">Structured placement preparation</span>
              <h1>Study roadmaps, practice, and progress in one place.</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <NavLink className="topbar-search" to="/search"><Search size={18} /><span>Search CodePrep</span></NavLink>
            <div className="user-menu">
              <NavLink to="/profile" className="profile-link"><UserCircle size={17} /><span>{user?.name}</span></NavLink>
              <button className="ghost-button" onClick={() => { logout(); navigate("/login"); }}>Log out</button>
            </div>
          </div>
        </header>
        <main className="page"><Outlet /></main>
      </div>
    </div>
  );
}

