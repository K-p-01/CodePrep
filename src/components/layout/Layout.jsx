import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, BookOpen, Bookmark, ChevronLeft, CircleHelp, Code2, GraduationCap, LayoutDashboard, LineChart, Map, Menu, Network, Search, Target, Timer, TrendingUp, X } from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { subjects, getSubject, getTopic } from "../../data/subjects.js";
import { getProgressStorageNotice } from "../../state/progressStore.js";

const navGroups = [
  { label: "Learning", items: [
    { label: "Dashboard", to: "/", icon: LayoutDashboard },
    { label: "Subjects", to: "/subjects", icon: BookOpen },
    { label: "DSA Roadmap", to: "/subjects/dsa", icon: Map },
    { label: "Pattern Explorer", to: "/patterns", icon: Network },
  ] },
  { label: "Practice", items: [
    { label: "MCQ Practice", to: "/practice?type=mcq", icon: Target },
    { label: "Coding Practice", to: "/practice?type=coding", icon: Code2 },
    { label: "Visualizations", to: "/subjects/dsa/topics/dynamic-programming#algorithm-lab", icon: Activity },
    { label: "Placement Simulation", to: "/simulation", icon: Timer },
  ] },
  { label: "Progress", items: [
    { label: "Daily Missions", to: "/#daily-mission", icon: TrendingUp },
    { label: "Smart Revision", to: "/revision", icon: Bookmark },
    { label: "Readiness Coach", to: "/readiness", icon: TrendingUp },
    { label: "Learning Analytics", to: "/analytics", icon: BarChart3 },
  ] },
];

const searchCatalog = subjects.flatMap((subject) => subject.topics.flatMap((topic) => [
  { label: topic.title, detail: `${subject.name} · Topic`, to: `/subjects/${subject.id}/topics/${topic.id}` },
  ...(topic.resources ?? []).map((item) => ({ label: item.title, detail: `${subject.name} · ${topic.title} · Resource`, to: `/subjects/${subject.id}/topics/${topic.id}#learn` })),
  ...(topic.practice?.problems ?? []).map((item) => ({ label: item.title, detail: `${subject.name} · ${topic.title} · Coding problem`, to: `/subjects/${subject.id}/topics/${topic.id}#practice` })),
  ...(topic.practice?.questions ?? []).map((item) => ({ label: item.prompt, detail: `${subject.name} · ${topic.title} · MCQ`, to: `/subjects/${subject.id}/topics/${topic.id}#practice` })),
]));
const staticResults = [
  { label: "Dashboard", detail: "Your learning workspace", to: "/" },
  { label: "Subjects", detail: "Browse the subject library", to: "/subjects" },
  { label: "Practice", detail: "Coding problems and MCQs", to: "/practice" },
  { label: "Smart Revision", detail: "Review saved and due items", to: "/revision" },
  { label: "Readiness Coach", detail: "Preparation recommendations", to: "/readiness" },
  { label: "Learning Analytics", detail: "Progress and consistency", to: "/analytics" },
];

function activeRoute(pathname, to, currentSearch = "") {
  const path = to.split("?")[0].split("#")[0];
  if (to.includes("?")) return pathname === path && new URLSearchParams(currentSearch).get("type") === new URLSearchParams(to.split("?")[1].split("#")[0]).get("type");
  if (path === "/") return pathname === "/";
  if (path === "/subjects") return pathname === "/subjects" || (pathname.startsWith("/subjects/") && !pathname.startsWith("/subjects/dsa"));
  return pathname === path || pathname.startsWith(`${path}/`);
}

function pageTitle(pathname) {
  const topicMatch = pathname.match(/^\/subjects\/([^/]+)\/topics\/([^/]+)/);
  if (topicMatch) return getTopic(topicMatch[1], topicMatch[2])?.title ?? "Topic workspace";
  const subjectMatch = pathname.match(/^\/subjects\/([^/]+)/);
  if (subjectMatch) return `${getSubject(subjectMatch[1])?.name ?? "Subject"} Roadmap`;
  const problemMatch = pathname.match(/^\/practice\/([^/]+)\/([^/]+)\/([^/]+)/);
  if (problemMatch) return getTopic(problemMatch[1], problemMatch[2])?.practice?.problems?.find((problem) => problem.id === problemMatch[3])?.title ?? "Coding workspace";
  return ({ "/": "Dashboard", "/subjects": "Subjects", "/practice": "Practice", "/progress": "Progress", "/revision": "Smart Revision", "/patterns": "Pattern Explorer", "/simulation": "Placement Simulation", "/readiness": "Readiness Coach", "/analytics": "Learning Analytics" })[pathname] ?? "Learning workspace";
}

function SearchBox({ onNavigate }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return [...searchCatalog, ...staticResults].filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(normalized)).slice(0, 7);
  }, [query]);
  return <div className="global-search">
    <Search size={17} aria-hidden="true" />
    <input aria-label="Search subjects, topics, resources, problems, and MCQs" placeholder="Search learning library…" value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); if (e.key === "Enter" && matches[0]) { setOpen(false); setQuery(""); onNavigate(matches[0].to); } }} />
    {query && <button type="button" className="search-clear" aria-label="Clear search" onClick={() => { setQuery(""); setOpen(false); }}><X size={14}/></button>}
    {open && query.trim() && <>
      <button type="button" className="search-dismiss" aria-label="Close search results" onClick={() => setOpen(false)} />
      <div className="search-results" role="listbox" aria-label="Search results">{matches.length ? matches.map((item) => <button type="button" role="option" key={`${item.to}:${item.label}`} onClick={() => { setOpen(false); setQuery(""); onNavigate(item.to); }}><strong>{item.label}</strong><small>{item.detail}</small></button>) : <p>No matching learning content</p>}</div>
    </>}
  </div>;
}

export default function Layout() {
  const [storageNotice, setStorageNotice] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMore, setMobileMore] = useState(false);
  const location = useLocation();
  const { pathname } = location;
  const navigate = useNavigate();

  useEffect(() => {
    setStorageNotice(getProgressStorageNotice());
    const updateNotice = (event) => setStorageNotice(event.detail ?? "");
    window.addEventListener("codeprep:storage-notice", updateNotice);
    return () => window.removeEventListener("codeprep:storage-notice", updateNotice);
  }, []);
  useEffect(() => { setMobileMore(false); }, [pathname]);
  useEffect(() => {
    if (location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }, [pathname, location.hash]);

  const navigateTo = (to) => { navigate(to); setMobileMore(false); };
  const renderItem = (item) => {
    const Icon = item.icon;
    const active = activeRoute(pathname, item.to, location.search);
    return <Link key={item.label} to={item.to} title={collapsed ? item.label : undefined} aria-label={collapsed ? item.label : undefined} aria-current={active ? "page" : undefined} className={`nav-item${active ? " active" : ""}`} onClick={() => setMobileMore(false)}><Icon size={18} aria-hidden="true" /><span>{item.label}</span></Link>;
  };

  return <div className={`app-shell${collapsed ? " sidebar-collapsed" : ""}`}>
    <aside className="sidebar" aria-label="Application navigation">
      <div className="sidebar-topline"><Link to="/" className="brand" aria-label="CodePrep dashboard"><span className="brand-mark"><GraduationCap size={21}/></span><strong>CodePrep</strong></Link><button className="sidebar-collapse" type="button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-pressed={collapsed} onClick={() => setCollapsed((value) => !value)}><ChevronLeft size={16}/></button></div>
      <nav className="side-nav" aria-label="Primary navigation">{navGroups.map((group) => <div className="nav-group" key={group.label}><span className="nav-group-label">{group.label}</span>{group.items.map(renderItem)}</div>)}</nav>
      <div className="sidebar-footer"><span className="sidebar-footer-icon"><CircleHelp size={16}/></span><div><strong>Local workspace</strong><span>Progress saves in this browser</span></div></div>
    </aside>
    <div className="main-area">
      <header className="topbar"><div className="topbar-context"><Link className="topbar-brand" to="/">CodePrep</Link><span className="topbar-divider">/</span><h1>{pageTitle(pathname)}</h1></div><SearchBox onNavigate={navigateTo}/><span className="workspace-pill"><span className="workspace-indicator"/>Local workspace</span></header>
      {storageNotice && <div className="storage-notice" role="status" aria-live="polite">{storageNotice}</div>}
      <main className="page"><Outlet/></main>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation">
      {[navGroups[0].items[0], navGroups[0].items[1], navGroups[1].items[0], navGroups[2].items[3]].map((item) => { const Icon = item.icon; const active = activeRoute(pathname, item.to, location.search); return <Link key={item.label} to={item.to} aria-label={item.label} aria-current={active ? "page" : undefined} className={`mobile-nav-item${active ? " active" : ""}`}><Icon size={19}/><span>{item.label === "Learning Analytics" ? "Analytics" : item.label}</span></Link>; })}
      <button type="button" className={`mobile-nav-item${mobileMore ? " active" : ""}`} aria-expanded={mobileMore} aria-controls="mobile-more-menu" onClick={() => setMobileMore((value) => !value)}><Menu size={19}/><span>More</span></button>
    </nav>
    {mobileMore && <><button className="mobile-menu-scrim" aria-label="Close navigation menu" onClick={() => setMobileMore(false)}/><div id="mobile-more-menu" className="mobile-more-menu"><div className="mobile-more-heading"><strong>Explore CodePrep</strong><button type="button" aria-label="Close menu" onClick={() => setMobileMore(false)}><X size={18}/></button></div>{navGroups.flatMap((group) => group.items).filter((item) => !["Dashboard", "Subjects", "MCQ Practice", "Learning Analytics"].includes(item.label)).map(renderItem)}</div></>}
  </div>;
}
