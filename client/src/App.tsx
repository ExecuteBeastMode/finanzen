import { useState, useEffect } from "react";
import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import FinancePage from "@/pages/Finance";
import TikTokPage from "@/pages/TikTok";
import DateIdeasPage from "@/pages/DateIdeas";
import RemindersPage from "@/pages/Reminders";
import DashboardHome from "@/pages/DashboardHome";
import NotesPage from "@/pages/Notes";
import ChoresPage from "@/pages/Chores";
import PRPage from "@/pages/PR";
import CalendarPage from "@/pages/Calendar";
import Game2048Page from "@/pages/Game2048";
import SettingsPage from "@/pages/Settings";
import SudokuPage from "@/pages/Sudoku";
import NewsPage from "@/pages/News";
import LernenPage from "@/pages/Lernen";
import SnakePage from "@/pages/Snake";
import MemoryPage from "@/pages/Memory";
import BreakoutPage from "@/pages/Breakout";
import QuizPage from "@/pages/Quiz";
import ShoppingPage from "@/pages/Shopping";
import TowerDefencePage from "@/pages/TowerDefence";
import NotificationManager from "@/components/NotificationManager";

// ─── NAV ITEMS (default order) ─────────────────────────────────────────────
export const DEFAULT_NAV_ITEMS = [
  {
    href: "/",
    label: "Übersicht",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="15" height="15">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: "/finanzen",
    label: "Finanzen",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="15" height="15">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
  {
    href: "/tiktok",
    label: "TikTok",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15" style={{ opacity: active ? 1 : 0.6 }}>
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.82a8.16 8.16 0 0 0 4.77 1.52V6.91a4.85 4.85 0 0 1-1-.22z"/>
      </svg>
    ),
  },
  {
    href: "/dates",
    label: "Dates",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" width="15" height="15">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
  },
  {
    href: "/notizen",
    label: "Notizen",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="15" height="15">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    href: "/haushalt",
    label: "Haushalt",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="15" height="15">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: "/kalender",
    label: "Kalender",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="15" height="15">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },

  {
    href: "/pr",
    label: "Training PR",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="15" height="15">
        <path d="M6 4v16M18 4v16M2 9h4M18 9h4M2 15h4M18 15h4"/>
      </svg>
    ),
  },
  {
    href: "/termine",
    label: "Termine",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="15" height="15">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
  },
  {
    href: "/game",
    label: "2048",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="15" height="15">
        <rect x="2" y="2" width="9" height="9" rx="1.5"/>
        <rect x="13" y="2" width="9" height="9" rx="1.5"/>
        <rect x="2" y="13" width="9" height="9" rx="1.5"/>
        <rect x="13" y="13" width="9" height="9" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: "/sudoku",
    label: "Sudoku",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="15" height="15">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/snake",
    label: "Snake",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="15" height="15">
        <path d="M8 3C5.24 3 3 5.24 3 8v2c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2H5"/>
        <path d="M16 3h-2c-1.1 0-2 .9-2 2v6c0 2.76 2.24 5 5 5h2"/>
        <path d="M19 13v5c0 1.66-1.34 3-3 3h-2"/>
      </svg>
    ),
  },
  {
    href: "/memory",
    label: "Memory",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="15" height="15">
        <rect x="2" y="3" width="9" height="11" rx="1.5"/>
        <rect x="13" y="3" width="9" height="11" rx="1.5"/>
        <rect x="2" y="17" width="9" height="5" rx="1.5"/>
        <rect x="13" y="17" width="9" height="5" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: "/breakout",
    label: "Breakout",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="15" height="15">
        <rect x="2" y="3" width="20" height="4" rx="1"/>
        <rect x="6" y="9" width="12" height="3" rx="1"/>
        <circle cx="12" cy="17" r="2"/>
        <rect x="7" y="21" width="10" height="2" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/news",
    label: "News",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="15" height="15">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
        <path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6z"/>
      </svg>
    ),
  },
  {
    href: "/lernen",
    label: "Lernkarten",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="15" height="15">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <path d="M16 2v3M8 2v3M2 10h20"/>
        <path d="M8 14h4M8 17h8"/>
      </svg>
    ),
  },
  {
    href: "/quiz",
    label: "Quiz",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="15" height="15">
        <circle cx="12" cy="12" r="10"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    href: "/einkauf",
    label: "Einkauf",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="15" height="15">
        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 0 1-8 0"/>
      </svg>
    ),
  },
  {
    href: "/tower",
    label: "Tower Defence",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="15" height="15">
        <rect x="3" y="11" width="18" height="11" rx="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        <circle cx="12" cy="16" r="1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    href: "/einstellungen",
    label: "Einstellungen",
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} width="15" height="15">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
];

// ─── HELPER: load ordered nav items from localStorage ─────────────────────
function getOrderedNavItems() {
  try {
    const raw = localStorage.getItem("lifeos_tab_order");
    if (!raw) return DEFAULT_NAV_ITEMS;
    const order: string[] = JSON.parse(raw);
    const map = new Map(DEFAULT_NAV_ITEMS.map(n => [n.href, n]));
    const ordered = order.map(href => map.get(href)).filter(Boolean) as typeof DEFAULT_NAV_ITEMS;
    // append any new tabs not yet in stored order
    DEFAULT_NAV_ITEMS.forEach(n => {
      if (!order.includes(n.href)) ordered.push(n);
    });
    return ordered;
  } catch {
    return DEFAULT_NAV_ITEMS;
  }
}

// ─── DESKTOP SIDEBAR ───────────────────────────────────────────────────────
function Sidebar() {
  const [location] = useLocation();
  const [navItems, setNavItems] = useState(getOrderedNavItems);

  // re-read order when settings change (storage event from same tab via custom event)
  useEffect(() => {
    const handler = () => setNavItems(getOrderedNavItems());
    window.addEventListener("lifeos_tab_order_changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("lifeos_tab_order_changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return (
    <aside className="desktop-sidebar">
      {/* Logo */}
      <div style={{ padding: "18px 16px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          {/* Logo mark */}
          <svg viewBox="0 0 20 20" width="18" height="18" fill="none">
            <circle cx="10" cy="10" r="9" stroke="rgba(74,222,128,0.4)" strokeWidth="1"/>
            <circle cx="10" cy="10" r="4" fill="rgba(74,222,128,0.15)" stroke="#4ade80" strokeWidth="1.2"/>
            <circle cx="10" cy="10" r="1.5" fill="#4ade80"/>
          </svg>
          <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "hsl(0 0% 90%)", letterSpacing: "-0.01em" }}>Life OS</span>
        </div>
        <div style={{ fontSize: "0.64rem", color: "hsl(0 0% 28%)", paddingLeft: 26 }}>
          {new Date().toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" })}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "hsl(0 0% 10%)", margin: "0 12px 8px" }} />

      {/* Nav */}
      <nav style={{ padding: "0 8px 8px", display: "flex", flexDirection: "column", gap: 1 }}>
        {navItems.map(({ href, label, icon }) => (
          <Link key={href} href={href} className={`sidebar-link ${location === href ? "active" : ""}`}>
            {icon(location === href)}
            {label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: "10px 16px 14px", borderTop: "1px solid hsl(0 0% 10%)" }}>
        <div style={{ fontSize: "0.6rem", color: "hsl(0 0% 22%)", letterSpacing: "0.04em" }}>PERSONAL DASHBOARD</div>
      </div>
    </aside>
  );
}

// ─── MOBILE HEADER ─────────────────────────────────────────────────────────
function MobileHeader() {
  const [location] = useLocation();
  const titles: Record<string, string> = {
    "/": "Übersicht",
    "/finanzen": "Finanzen",
    "/tiktok": "TikTok",
    "/dates": "Date Ideen",
    "/notizen": "Notizen",
    "/haushalt": "Haushalt",
    "/kalender": "Kalender",
    "/pr": "Training PR",
    "/termine": "Termine",
    "/game": "2048",
    "/sudoku": "Sudoku",
    "/snake": "Snake",
    "/memory": "Memory",
    "/breakout": "Breakout",
    "/news": "News",
    "/lernen": "Lernkarten",
    "/quiz": "Quiz",
    "/einstellungen": "Einstellungen",
  };
  return (
    <header className="mobile-header">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
          <circle cx="10" cy="10" r="9" stroke="rgba(74,222,128,0.4)" strokeWidth="1"/>
          <circle cx="10" cy="10" r="4" fill="rgba(74,222,128,0.15)" stroke="#4ade80" strokeWidth="1.2"/>
          <circle cx="10" cy="10" r="1.5" fill="#4ade80"/>
        </svg>
        <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "hsl(0 0% 88%)" }}>
          {titles[location] || "Life OS"}
        </span>
      </div>
      <span style={{ fontSize: "0.65rem", color: "hsl(0 0% 30%)" }}>
        {new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
      </span>
    </header>
  );
}

// ─── MOBILE BOTTOM TAB BAR + POPUP SHEET ──────────────────────────────────
function BottomTabBar() {
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [navItems, setNavItems] = useState(getOrderedNavItems);

  useEffect(() => {
    const handler = () => setNavItems(getOrderedNavItems());
    window.addEventListener("lifeos_tab_order_changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("lifeos_tab_order_changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const pinned = navItems.filter(n => ["/", "/finanzen", "/kalender", "/termine"].includes(n.href));

  const handleNav = (href: string) => { navigate(href); setOpen(false); };

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 98, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" as any }}
        />
      )}

      {open && (
        <div style={{
          position: "fixed", bottom: "calc(64px + env(safe-area-inset-bottom))", left: 10, right: 10, zIndex: 99,
          background: "hsl(0 0% 7%)", border: "1px solid hsl(0 0% 15%)",
          borderRadius: 20, padding: "16px 12px 12px",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6)"
        }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "hsl(0 0% 20%)", margin: "0 auto 16px" }} />
          <div style={{ fontSize: "0.62rem", fontWeight: 600, color: "hsl(0 0% 30%)", letterSpacing: "0.1em", textTransform: "uppercase" as any, marginBottom: 10, paddingLeft: 4 }}>Navigation</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {navItems.map(({ href, label, icon }) => {
              const active = location === href;
              return (
                <button
                  key={href}
                  onClick={() => handleNav(href)}
                  style={{
                    display: "flex", flexDirection: "column" as any, alignItems: "center", justifyContent: "center",
                    gap: 6, padding: "12px 8px", borderRadius: 12, border: "none", cursor: "pointer",
                    background: active ? "rgba(74,222,128,0.12)" : "hsl(0 0% 10%)",
                    outline: active ? "1px solid rgba(74,222,128,0.3)" : "1px solid transparent",
                    color: active ? "#4ade80" : "hsl(0 0% 55%)",
                    WebkitTapHighlightColor: "transparent" as any
                  }}
                >
                  {icon(active)}
                  <span style={{ fontSize: "0.62rem", fontWeight: 500, lineHeight: 1.2, textAlign: "center" as any }}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <nav className="mobile-bottom-nav">
        {pinned.map(({ href, label, icon }) => {
          const active = location === href && !open;
          return (
            <Link key={href} href={href} className={`mobile-tab-item ${active ? "active" : ""}`} onClick={() => setOpen(false)}>
              <span>{icon(active)}</span>
              <span className="mobile-tab-label">{label}</span>
            </Link>
          );
        })}

        <button
          onClick={() => setOpen(v => !v)}
          className="mobile-tab-item"
          style={{ flex: 1, background: "none", border: "none", cursor: "pointer", color: open ? "#4ade80" : "hsl(0 0% 32%)", WebkitTapHighlightColor: "transparent" as any }}
        >
          <span style={{ display: "flex", flexDirection: "column" as any, gap: 2.5, alignItems: "center", justifyContent: "center", width: 16, height: 16 }}>
            <span style={{ display: "flex", gap: 2.5 }}>
              <span style={{ width: 5, height: 5, borderRadius: 1.5, background: open ? "#4ade80" : "currentColor" }} />
              <span style={{ width: 5, height: 5, borderRadius: 1.5, background: open ? "#4ade80" : "currentColor" }} />
            </span>
            <span style={{ display: "flex", gap: 2.5 }}>
              <span style={{ width: 5, height: 5, borderRadius: 1.5, background: open ? "#4ade80" : "currentColor" }} />
              <span style={{ width: 5, height: 5, borderRadius: 1.5, background: open ? "#4ade80" : "currentColor" }} />
            </span>
          </span>
          <span className="mobile-tab-label" style={{ color: open ? "#4ade80" : undefined }}>Life OS</span>
        </button>
      </nav>
    </>
  );
}

// ─── APP ───────────────────────────────────────────────────────────────────
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <div className="app-shell">
          <Sidebar />
          <MobileHeader />
          <main className="app-main">
            <Switch>
              <Route path="/" component={DashboardHome} />
              <Route path="/finanzen" component={FinancePage} />
              <Route path="/tiktok" component={TikTokPage} />
              <Route path="/dates" component={DateIdeasPage} />
              <Route path="/notizen" component={NotesPage} />
              <Route path="/haushalt" component={ChoresPage} />
              <Route path="/kalender" component={CalendarPage} />
              <Route path="/pr" component={PRPage} />
              <Route path="/termine" component={RemindersPage} />
              <Route path="/game" component={Game2048Page} />
              <Route path="/sudoku" component={SudokuPage} />
              <Route path="/snake" component={SnakePage} />
              <Route path="/memory" component={MemoryPage} />
              <Route path="/breakout" component={BreakoutPage} />
              <Route path="/news" component={NewsPage} />
              <Route path="/lernen" component={LernenPage} />
              <Route path="/quiz" component={QuizPage} />
              <Route path="/einkauf" component={ShoppingPage} />
              <Route path="/tower" component={TowerDefencePage} />
              <Route path="/einstellungen" component={SettingsPage} />
            </Switch>
          </main>
          <BottomTabBar />
          <NotificationManager />
        </div>
        <Toaster />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
