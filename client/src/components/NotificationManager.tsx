/**
 * NotificationManager — kümmert sich um:
 * 1. Service Worker Registrierung
 * 2. Benachrichtigungserlaubnis anfragen
 * 3. Startup-Popup: offene Termine & Haushalt beim App-Start
 * 4. Tägliche Erinnerungen via scheduled setTimeout
 */
import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Reminder } from "@shared/schema";

// ─── TYPES ────────────────────────────────────────────────────────────────
type Chore = {
  id: number;
  title: string;
  category: string;
  frequency: string;
  done: boolean;
  nextDue: string | null;
  priority: string;
};

type NotifItem = {
  type: "reminder" | "chore";
  title: string;
  subtitle: string;
  urgency: "overdue" | "today" | "soon" | "due";
  icon: string;
};

// ─── HELPERS ──────────────────────────────────────────────────────────────
const LS_NOTIF = "lifeos_notif_enabled";
const LS_POPUP_DATE = "lifeos_popup_last_shown";

function isDue(chore: Chore): boolean {
  if (chore.done) return false;
  if (!chore.nextDue) return true;
  return new Date(chore.nextDue) <= new Date();
}

function getDaysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

function getEffectiveDate(r: Reminder): Date {
  const d = new Date(r.date);
  if (r.recurring && r.type === "birthday") {
    const today = new Date();
    const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1);
    return thisYear;
  }
  return d;
}

async function sendNotification(title: string, body: string, tag: string, url = "/") {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    if (reg) {
      reg.active?.postMessage({
        type: "CHECK_NOTIFICATIONS",
        notifications: [{ title, body, tag, url }],
      });
      return;
    }
  }
  // Fallback: direkte Notification
  new Notification(title, { body, tag, icon: "/icons/icon-192.png" });
}

// ─── STARTUP POPUP ────────────────────────────────────────────────────────
function StartupPopup({
  items,
  onClose,
}: {
  items: NotifItem[];
  onClose: () => void;
}) {
  const urgencyColor: Record<string, string> = {
    overdue: "#f87171",
    today: "#fbbf24",
    soon: "#4ade80",
    due: "#fb923c",
  };

  const overdue = items.filter((i) => i.urgency === "overdue");
  const today = items.filter((i) => i.urgency === "today");
  const soon = items.filter((i) => i.urgency === "soon");
  const due = items.filter((i) => i.urgency === "due");

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 201,
          background: "hsl(0 0% 6%)",
          border: "1px solid hsl(0 0% 14%)",
          borderBottom: "none",
          borderRadius: "20px 20px 0 0",
          padding: "0 0 env(safe-area-inset-bottom)",
          maxHeight: "82vh",
          overflowY: "auto",
          boxShadow: "0 -16px 60px rgba(0,0,0,0.7)",
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "hsl(0 0% 20%)", margin: "14px auto 0" }} />

        {/* Header */}
        <div
          style={{
            padding: "16px 20px 12px",
            borderBottom: "1px solid hsl(0 0% 11%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "hsl(0 0% 88%)", marginBottom: 2 }}>
              {items.length} offene Punkt{items.length !== 1 ? "e" : ""}
            </div>
            <div style={{ fontSize: "0.7rem", color: "hsl(0 0% 38%)" }}>
              {new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8, border: "1px solid hsl(0 0% 16%)",
              background: "hsl(0 0% 11%)", color: "hsl(0 0% 55%)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Sections */}
        <div style={{ padding: "14px 16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { label: "Überfällig", color: "#f87171", items: overdue },
            { label: "Heute", color: "#fbbf24", items: today },
            { label: "Haushalt fällig", color: "#fb923c", items: due },
            { label: "Diese Woche", color: "#4ade80", items: soon },
          ]
            .filter((s) => s.items.length > 0)
            .map((section) => (
              <div key={section.label}>
                <div
                  style={{
                    fontSize: "0.64rem",
                    fontWeight: 700,
                    color: section.color,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: 8,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: section.color,
                    }}
                  />
                  {section.label} ({section.items.length})
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {section.items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "hsl(0 0% 9%)",
                        border: `1px solid ${section.color}18`,
                      }}
                    >
                      <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{item.icon}</span>
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div
                          style={{
                            fontSize: "0.83rem",
                            fontWeight: 600,
                            color: "hsl(0 0% 82%)",
                            marginBottom: 1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.title}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "hsl(0 0% 38%)" }}>{item.subtitle}</div>
                      </div>
                      <span
                        style={{
                          fontSize: "0.62rem",
                          fontWeight: 700,
                          color: section.color,
                          flexShrink: 0,
                          padding: "2px 7px",
                          borderRadius: 4,
                          background: section.color + "15",
                          border: `1px solid ${section.color}30`,
                        }}
                      >
                        {item.urgency === "overdue" ? "ÜBERFÄLLIG" :
                          item.urgency === "today" ? "HEUTE" :
                          item.urgency === "due" ? "FÄLLIG" : "BALD"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}

// ─── NOTIFICATION PERMISSION BANNER ───────────────────────────────────────
function NotifPermissionBanner({ onEnable, onDismiss }: { onEnable: () => void; onDismiss: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top) + 56px)",
        left: 12,
        right: 12,
        zIndex: 150,
        background: "hsl(0 0% 8%)",
        border: "1px solid rgba(74,222,128,0.25)",
        borderRadius: 14,
        padding: "14px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: "rgba(74,222,128,0.1)",
          border: "1px solid rgba(74,222,128,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.8" width="18" height="18">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "0.83rem", fontWeight: 600, color: "hsl(0 0% 85%)", marginBottom: 3 }}>
          Benachrichtigungen aktivieren?
        </div>
        <div style={{ fontSize: "0.7rem", color: "hsl(0 0% 42%)", lineHeight: 1.5, marginBottom: 12 }}>
          Erhalte Erinnerungen für Termine und fällige Haushaltsaufgaben direkt auf dem iPhone.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onEnable}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              background: "rgba(74,222,128,0.18)", color: "#4ade80",
              fontSize: "0.75rem", fontWeight: 600, outline: "1px solid rgba(74,222,128,0.3)",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            Aktivieren
          </button>
          <button
            onClick={onDismiss}
            style={{
              padding: "8px 14px", borderRadius: 8, border: "1px solid hsl(0 0% 18%)",
              background: "transparent", color: "hsl(0 0% 45%)",
              fontSize: "0.75rem", cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            Nicht jetzt
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN HOOK ────────────────────────────────────────────────────────────
export function useNotifications() {
  const [popupItems, setPopupItems] = useState<NotifItem[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [showPermBanner, setShowPermBanner] = useState(false);
  const initialized = useRef(false);

  const { data: reminders = [] } = useQuery<Reminder[]>({ queryKey: ["/api/reminders"] });
  const { data: chores = [] } = useQuery<Chore[]>({ queryKey: ["/api/chores"] });

  // Register Service Worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => console.log("[Life OS] SW registered", reg.scope))
        .catch((err) => console.warn("[Life OS] SW registration failed", err));
    }
  }, []);

  // Build notification items once data is loaded
  useEffect(() => {
    if (initialized.current) return;
    if (!reminders.length && !chores.length) return;
    initialized.current = true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const items: NotifItem[] = [];

    // ── Termine / Reminders ──────────────────────────────────────────────
    const TYPE_ICONS: Record<string, string> = { reminder: "🔔", birthday: "🎂", appointment: "📅" };
    const TYPE_LABELS: Record<string, string> = { reminder: "Erinnerung", birthday: "Geburtstag", appointment: "Termin" };

    reminders
      .filter((r) => !r.done)
      .forEach((r) => {
        const eff = getEffectiveDate(r);
        const days = getDaysUntil(eff.toISOString().slice(0, 10));

        if (days < 0 && !r.recurring) {
          items.push({
            type: "reminder",
            title: r.title,
            subtitle: `${Math.abs(days)} Tag${Math.abs(days) === 1 ? "" : "e"} überfällig · ${TYPE_LABELS[r.type]}`,
            urgency: "overdue",
            icon: TYPE_ICONS[r.type],
          });
        } else if (days === 0) {
          items.push({
            type: "reminder",
            title: r.title,
            subtitle: `Heute · ${TYPE_LABELS[r.type]}`,
            urgency: "today",
            icon: TYPE_ICONS[r.type],
          });
        } else if (days > 0 && days <= 3) {
          items.push({
            type: "reminder",
            title: r.title,
            subtitle: `in ${days} Tag${days === 1 ? "" : "en"} · ${TYPE_LABELS[r.type]}`,
            urgency: "soon",
            icon: TYPE_ICONS[r.type],
          });
        }
      });

    // ── Haushaltsaufgaben ─────────────────────────────────────────────────
    const CAT_ICONS: Record<string, string> = {
      allgemein: "🏠", küche: "🍳", bad: "🚿", wohnzimmer: "🛋️",
      draußen: "🌿", wäsche: "👕", einkauf: "🛒",
    };
    const PRIO_LABEL: Record<string, string> = { high: "Hoch", medium: "Mittel", low: "Niedrig" };

    chores
      .filter((c) => isDue(c))
      .forEach((c) => {
        items.push({
          type: "chore",
          title: c.title,
          subtitle: `Priorität: ${PRIO_LABEL[c.priority] || c.priority}`,
          urgency: "due",
          icon: CAT_ICONS[c.category] || "🏠",
        });
      });

    if (items.length === 0) return;

    // ── Startup-Popup: sofort beim Öffnen der App anzeigen ─────────────
    setPopupItems(items);
    setShowPopup(true);

    // ── Push-Benachrichtigungen senden (falls erlaubt) ────────────────────
    const notifEnabled = localStorage.getItem(LS_NOTIF) === "true";
    if (notifEnabled && Notification.permission === "granted") {
      const overdue = items.filter((i) => i.urgency === "overdue");
      const todayItems = items.filter((i) => i.urgency === "today");
      const dueChores = items.filter((i) => i.urgency === "due");

      if (overdue.length > 0) {
        sendNotification(
          `⚠️ ${overdue.length} überfällige${overdue.length === 1 ? "r Termin" : " Termine"}`,
          overdue.map((i) => i.title).join(" · "),
          "lifeos-overdue",
          "/#/termine"
        );
      }
      if (todayItems.length > 0) {
        setTimeout(() => {
          sendNotification(
            `📅 Heute: ${todayItems[0].title}`,
            todayItems.length > 1 ? `+${todayItems.length - 1} weitere Ereignisse` : todayItems[0].subtitle,
            "lifeos-today",
            "/#/termine"
          );
        }, 3000);
      }
      if (dueChores.length > 0) {
        setTimeout(() => {
          sendNotification(
            `🏠 ${dueChores.length} Haushaltsaufgabe${dueChores.length === 1 ? "" : "n"} fällig`,
            dueChores
              .slice(0, 3)
              .map((i) => i.title)
              .join(" · "),
            "lifeos-chores",
            "/#/haushalt"
          );
        }, 6000);
      }
    }

    // ── Benachrichtigungs-Banner anzeigen wenn noch nicht erlaubt ─────────
    if (
      "Notification" in window &&
      Notification.permission === "default" &&
      !notifEnabled &&
      !localStorage.getItem("lifeos_notif_dismissed")
    ) {
      setTimeout(() => setShowPermBanner(true), 2500);
    }
  }, [reminders, chores]);

  // Permission anfragen
  const requestPermission = async () => {
    setShowPermBanner(false);
    if (!("Notification" in window)) return;

    const result = await Notification.requestPermission();
    if (result === "granted") {
      localStorage.setItem(LS_NOTIF, "true");
      // Sofort Test-Notification
      sendNotification(
        "Life OS Benachrichtigungen aktiv ✓",
        "Du erhältst ab jetzt Erinnerungen für Termine und Haushalt.",
        "lifeos-welcome"
      );
    }
  };

  const dismissBanner = () => {
    setShowPermBanner(false);
    localStorage.setItem("lifeos_notif_dismissed", "true");
  };

  return {
    popupItems,
    showPopup,
    setShowPopup,
    showPermBanner,
    requestPermission,
    dismissBanner,
  };
}

// ─── EXPORTED COMPONENT ───────────────────────────────────────────────────
export default function NotificationManager() {
  const { popupItems, showPopup, setShowPopup, showPermBanner, requestPermission, dismissBanner } =
    useNotifications();

  return (
    <>
      {showPermBanner && (
        <NotifPermissionBanner onEnable={requestPermission} onDismiss={dismissBanner} />
      )}
      {showPopup && popupItems.length > 0 && (
        <StartupPopup items={popupItems} onClose={() => setShowPopup(false)} />
      )}
    </>
  );
}
