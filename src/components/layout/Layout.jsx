import { useEffect, useState } from "react";
import { BookOpen, Bookmark, CircleHelp, GraduationCap, LayoutDashboard, LineChart, Map, Network, Target, Timer } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { getProgressStorageNotice } from "../../state/progressStore.js";

const navGroups = [
  { label: "Workspace", items: [
    { label: "Dashboard", to: "/", icon: LayoutDashboard },
    { label: "Subjects", to: "/subjects", icon: BookOpen },
    { label: "DSA Roadmap", to: "/subjects/dsa", icon: Map },
    { label: "Pattern Explorer", to: "/patterns", icon: Network },
  ] },
  { label: "Study", items: [
    { label: "Practice", to: "/practice", icon: Target },
    { label: "Progress", to: "/progress", icon: LineChart },
    { label: "Revision", to: "/revision", icon: Bookmark },
    { label: "Simulation", to: "/simulation", icon: Timer },
  ] },
];

export default function Layout() {
  const [storageNotice, setStorageNotice] = useState("");
  const { pathname } = useLocation();

  useEffect(() => {
    setStorageNotice(getProgressStorageNotice());
    const updateNotice = (event) => setStorageNotice(event.detail ?? "");
    window.addEventListener("codeprep:storage-notice", updateNotice);
    return () => window.removeEventListener("codeprep:storage-notice", updateNotice);
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink to="/" className="brand" aria-label="CodePrep dashboard">
          <div className="brand-mark">
            <GraduationCap size={24} />
          </div>
          <div>
            <strong>CodePrep</strong>
            <span>Placement Roadmaps</span>
          </div>
        </NavLink>

        <nav className="side-nav" aria-label="Primary navigation">
          {navGroups.map((group) => <div className="nav-group" key={group.label}>
            <span className="nav-group-label">{group.label}</span>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = item.to === "/"
                ? pathname === "/"
                : item.to === "/subjects"
                  ? pathname === "/subjects" || (pathname.startsWith("/subjects/") && !pathname.startsWith("/subjects/dsa"))
                  : item.to === "/subjects/dsa"
                    ? pathname.startsWith("/subjects/dsa")
                    : pathname === item.to || pathname.startsWith(`${item.to}/`);
              return <NavLink key={item.label} to={item.to} end className={`nav-item${active ? " active" : ""}`}>
                <Icon size={18} aria-hidden="true" /><span>{item.label}</span>
              </NavLink>;
            })}
          </div>)}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-footer-icon"><CircleHelp size={17} /></div>
          <div><strong>Local workspace</strong><span>Progress saves in this browser</span></div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-title">
            <span className="eyebrow">CODEPREP <span className="topbar-divider">/</span> PLACEMENT PREP</span>
            <h1>Learn with a clear next step.</h1>
          </div>
          <div className="workspace-pill"><span className="workspace-indicator" />Student workspace</div>
        </header>
        {storageNotice && <div className="storage-notice" role="status" aria-live="polite">{storageNotice}</div>}
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
