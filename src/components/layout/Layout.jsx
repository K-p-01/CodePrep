import { BookOpen, GraduationCap, LayoutDashboard, LineChart, Map, Target } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Subjects", to: "/subjects", icon: BookOpen },
  { label: "Roadmap", to: "/subjects/dsa", icon: Map },
  { label: "Practice", to: "/practice", icon: Target },
  { label: "Progress", to: "/progress", icon: LineChart },
];

export default function Layout() {
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
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.label} to={item.to} end={item.to === "/"} className="nav-item">
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div>
            <span className="eyebrow">Structured placement preparation</span>
            <h1>Study roadmaps, practice, and progress in one place.</h1>
          </div>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
