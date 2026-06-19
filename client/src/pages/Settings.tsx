import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_NAV_ITEMS } from "@/App";

// ─── NOTIFICATION STATUS helper ───────────────────────────────────────────
function useNotifStatus() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [enabled, setEnabled] = useState(localStorage.getItem("lifeos_notif_enabled") === "true");
  const [supported] = useState("Notification" in window && "serviceWorker" in navigator);

  const request = async () => {
    if (!supported) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      localStorage.setItem("lifeos_notif_enabled", "true");
      localStorage.removeItem("lifeos_notif_dismissed");
      setEnabled(true);
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready.catch(() => null);
        reg?.active?.postMessage({
          type: "CHECK_NOTIFICATIONS",
          notifications: [{
            title: "Life OS Benachrichtigungen aktiv ✓",
            body: "Du erhältst ab jetzt Erinnerungen für Termine und Haushalt.",
            tag: "lifeos-test",
          }],
        });
      }
    }
  };

  const disable = () => {
    localStorage.removeItem("lifeos_notif_enabled");
    localStorage.setItem("lifeos_notif_dismissed", "true");
    setEnabled(false);
  };

  const resetPopup = () => {
    localStorage.removeItem("lifeos_popup_last_shown");
  };

  return { permission, enabled, supported, request, disable, resetPopup };
}

const RESET_CODE = "3699";

// ─── TAB ORDER helpers ─────────────────────────────────────────────────────
const LS_KEY = "lifeos_tab_order";

function loadOrder(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_NAV_ITEMS.map(n => n.href);
    const saved: string[] = JSON.parse(raw);
    // merge: keep saved order but append new tabs
    const extra = DEFAULT_NAV_ITEMS.map(n => n.href).filter(h => !saved.includes(h));
    return [...saved, ...extra];
  } catch {
    return DEFAULT_NAV_ITEMS.map(n => n.href);
  }
}

function saveOrder(order: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(order));
  window.dispatchEvent(new Event("lifeos_tab_order_changed"));
}

// ─── NOTIF CARD ──────────────────────────────────────────────────────────────
function NotifCard({ cardStyle }: { cardStyle: React.CSSProperties }) {
  const { permission, enabled, supported, request, disable, resetPopup } = useNotifStatus();
  const { toast } = useToast();

  const statusLabel = !supported
    ? { text: "Nicht unterstützt", color: "hsl(0 0% 40%)" }
    : permission === "granted" && enabled
    ? { text: "Aktiv", color: "#4ade80" }
    : permission === "denied"
    ? { text: "Blockiert", color: "#f87171" }
    : { text: "Inaktiv", color: "hsl(0 0% 40%)" };

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.8" width="18" height="18">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "hsl(0 0% 85%)" }}>Benachrichtigungen</div>
            <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: statusLabel.color + "18", color: statusLabel.color, border: `1px solid ${statusLabel.color}30` }}>
              {statusLabel.text}
            </span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "hsl(0 0% 40%)", lineHeight: 1.5 }}>
            iPhone-Benachrichtigungen für fällige Termine und Haushaltsaufgaben.
          </div>
        </div>
      </div>

      {/* iPhone PWA Hinweis */}
      {supported && permission !== "granted" && (
        <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)", fontSize: "0.7rem", color: "hsl(0 0% 45%)", lineHeight: 1.6, marginBottom: 14 }}>
          <span style={{ fontWeight: 600, color: "hsl(0 0% 58%)" }}>iPhone-Tipp:</span> Für Benachrichtigungen die App zum Homescreen hinzufügen → teilen-Symbol → „Zum Homescreen“, dann App über Homescreen öffnen.
        </div>
      )}

      {permission === "denied" && (
        <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", fontSize: "0.7rem", color: "#f87171", lineHeight: 1.6, marginBottom: 14 }}>
          Benachrichtigungen wurden blockiert. → iPhone-Einstellungen → Safari/App → Benachrichtigungen erlauben.
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {!enabled && permission !== "denied" && supported && (
          <button
            onClick={request}
            style={{ padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(251,191,36,0.15)", color: "#fbbf24", fontSize: "0.78rem", fontWeight: 600, outline: "1px solid rgba(251,191,36,0.3)", WebkitTapHighlightColor: "transparent" as any }}
          >
            Aktivieren
          </button>
        )}
        {enabled && (
          <button
            onClick={() => { disable(); toast({ title: "Benachrichtigungen deaktiviert" }); }}
            style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid hsl(0 0% 18%)", background: "hsl(0 0% 10%)", color: "hsl(0 0% 50%)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", WebkitTapHighlightColor: "transparent" as any }}
          >
            Deaktivieren
          </button>
        )}
        <button
          onClick={() => { resetPopup(); toast({ title: "Popup zurückgesetzt", description: "Beim nächsten App-Start wird das Popup wieder angezeigt." }); }}
          style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid hsl(0 0% 16%)", background: "transparent", color: "hsl(0 0% 42%)", fontSize: "0.75rem", cursor: "pointer", WebkitTapHighlightColor: "transparent" as any }}
        >
          Popup zurücksetzen
        </button>
      </div>
    </div>
  );
}

// ─── COMPONENT ────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Import state ──────────────────────────────────────────────────────────
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);

  // ── Reset state ───────────────────────────────────────────────────────────
  const [resetPhase, setResetPhase] = useState<"idle" | "warn" | "code" | "done">("idle");
  const [resetCode, setResetCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [resetting, setResetting] = useState(false);

  // ── Tab order state ───────────────────────────────────────────────────────
  const [tabOrder, setTabOrder] = useState<string[]>(loadOrder);

  // Keep label map for display
  const labelMap = new Map(DEFAULT_NAV_ITEMS.map(n => [n.href, n.label]));
  const iconMap = new Map(DEFAULT_NAV_ITEMS.map(n => [n.href, n.icon]));

  // Persist order whenever it changes
  useEffect(() => {
    saveOrder(tabOrder);
  }, [tabOrder]);

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setTabOrder(prev => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveDown = (idx: number) => {
    setTabOrder(prev => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const resetOrder = () => {
    const def = DEFAULT_NAV_ITEMS.map(n => n.href);
    setTabOrder(def);
    toast({ title: "Reihenfolge zurückgesetzt", description: "Standard-Reihenfolge wiederhergestellt." });
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const a = document.createElement("a");
    a.href = "/api/export";
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ title: "Backup wird heruntergeladen", description: "Die JSON-Datei enthält alle deine Daten." });
  };

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".json")) {
      toast({ title: "Falsches Format", description: "Bitte nur eine .json Backup-Datei hochladen.", variant: "destructive" });
      return;
    }
    const confirmed = window.confirm("⚠️ Import überschreibt ALLE vorhandenen Daten!\n\nWirklich fortfahren?");
    if (!confirmed) { if (fileRef.current) fileRef.current.value = ""; return; }

    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Unbekannter Fehler");
      setImportDone(true);
      toast({ title: "Import erfolgreich!", description: "Alle Daten wurden wiederhergestellt. Seite wird neu geladen…" });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      toast({ title: "Import fehlgeschlagen", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleResetConfirmCode = async () => {
    if (resetCode !== RESET_CODE) {
      setCodeError(true);
      setTimeout(() => setCodeError(false), 1200);
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/reset", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Fehler");
      setResetPhase("done");
      toast({ title: "Reset abgeschlossen", description: "Alle Daten wurden gelöscht. Seite wird neu geladen…" });
      setTimeout(() => window.location.reload(), 1800);
    } catch (err: any) {
      toast({ title: "Reset fehlgeschlagen", description: err.message, variant: "destructive" });
      setResetPhase("idle");
    } finally {
      setResetting(false);
      setResetCode("");
    }
  };

  const cancelReset = () => { setResetPhase("idle"); setResetCode(""); setCodeError(false); };

  // ── Shared styles ─────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: "hsl(0 0% 7%)",
    border: "1px solid hsl(0 0% 13%)",
    borderRadius: 14,
    padding: "18px 16px",
    marginBottom: 14,
  };

  const arrowBtn = (disabled: boolean): React.CSSProperties => ({
    width: 28, height: 28, borderRadius: 6, border: "1px solid hsl(0 0% 16%)",
    background: disabled ? "transparent" : "hsl(0 0% 10%)",
    color: disabled ? "hsl(0 0% 25%)" : "hsl(0 0% 60%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: disabled ? "default" : "pointer", flexShrink: 0,
    transition: "background 0.12s",
    WebkitTapHighlightColor: "transparent" as any,
  });

  return (
    <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.1rem", fontWeight: 700, color: "hsl(0 0% 88%)", marginBottom: 4 }}>Einstellungen</h1>
      <p style={{ fontSize: "0.72rem", color: "hsl(0 0% 35%)", marginBottom: 24 }}>Tabs · Benachrichtigungen · Backup · Reset</p>

      {/* ── Benachrichtigungen ───────────────────────────────────────────────── */}
      <NotifCard cardStyle={cardStyle} />

      {/* ── Tab-Reihenfolge ──────────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "hsl(0 0% 85%)" }}>Tab-Reihenfolge</div>
            <div style={{ fontSize: "0.7rem", color: "hsl(0 0% 38%)", marginTop: 2 }}>Reihenfolge in Sidebar & Menü anpassen</div>
          </div>
          <button
            onClick={resetOrder}
            style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid hsl(0 0% 16%)", background: "hsl(0 0% 10%)", color: "hsl(0 0% 50%)", fontSize: "0.7rem", cursor: "pointer", WebkitTapHighlightColor: "transparent" as any }}
          >
            Reset
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {tabOrder.map((href, idx) => {
            const label = labelMap.get(href) ?? href;
            const icon = iconMap.get(href);
            return (
              <div
                key={href}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", borderRadius: 9,
                  background: "hsl(0 0% 9%)", border: "1px solid hsl(0 0% 12%)",
                }}
              >
                {/* Drag handle (visual only) */}
                <span style={{ color: "hsl(0 0% 28%)", flexShrink: 0, lineHeight: 1, fontSize: "0.9rem" }}>⠿</span>

                {/* Icon */}
                <span style={{ color: "hsl(0 0% 50%)", display: "flex", alignItems: "center" }}>
                  {icon ? icon(false) : null}
                </span>

                {/* Label */}
                <span style={{ flex: 1, fontSize: "0.8rem", color: "hsl(0 0% 72%)", fontWeight: 500 }}>{label}</span>

                {/* Order number */}
                <span style={{ fontSize: "0.64rem", color: "hsl(0 0% 28%)", minWidth: 18, textAlign: "right" }}>{idx + 1}</span>

                {/* ▲ ▼ */}
                <div style={{ display: "flex", gap: 3 }}>
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    style={arrowBtn(idx === 0)}
                    title="Nach oben"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                      <polyline points="18 15 12 9 6 15"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === tabOrder.length - 1}
                    style={arrowBtn(idx === tabOrder.length - 1)}
                    title="Nach unten"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 10, fontSize: "0.68rem", color: "hsl(0 0% 30%)", lineHeight: 1.6 }}>
          Änderungen werden sofort gespeichert und in der Sidebar sowie im Menü übernommen.
        </div>
      </div>

      {/* ── Export ──────────────────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.8" width="18" height="18">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "hsl(0 0% 85%)", marginBottom: 3 }}>Daten exportieren</div>
            <div style={{ fontSize: "0.72rem", color: "hsl(0 0% 40%)", lineHeight: 1.5, marginBottom: 14 }}>
              Alle Daten als JSON-Datei herunterladen. Ideal als Backup vor einem Handywechsel.
            </div>
            <button onClick={handleExport} style={{ padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(74,222,128,0.15)", color: "#4ade80", fontSize: "0.78rem", fontWeight: 600, outline: "1px solid rgba(74,222,128,0.25)", WebkitTapHighlightColor: "transparent" as any }}>
              Backup herunterladen
            </button>
          </div>
        </div>
      </div>

      {/* ── Import ──────────────────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="1.8" width="18" height="18">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "hsl(0 0% 85%)", marginBottom: 3 }}>Daten importieren</div>
            <div style={{ fontSize: "0.72rem", color: "hsl(0 0% 40%)", lineHeight: 1.5, marginBottom: 6 }}>Backup-Datei hochladen und alle Daten wiederherstellen.</div>
            <div style={{ padding: "8px 10px", borderRadius: 6, background: "rgba(251,146,60,0.06)", border: "1px solid rgba(251,146,60,0.15)", fontSize: "0.68rem", color: "hsl(0 0% 42%)", marginBottom: 14, lineHeight: 1.5 }}>
              ⚠️ Überschreibt alle vorhandenen Daten — vorher Backup machen!
            </div>
            <input ref={fileRef} type="file" accept=".json" onChange={handleImport} disabled={importing} style={{ display: "none" }} id="import-file-input" />
            <label htmlFor="import-file-input" style={{ display: "inline-block", padding: "9px 18px", borderRadius: 8, background: importing ? "hsl(0 0% 12%)" : "rgba(251,146,60,0.12)", color: importing ? "hsl(0 0% 40%)" : "#fb923c", fontSize: "0.78rem", fontWeight: 600, outline: importing ? "1px solid transparent" : "1px solid rgba(251,146,60,0.25)", cursor: importing ? "not-allowed" : "pointer", WebkitTapHighlightColor: "transparent" as any }}>
              {importing ? "Wird importiert…" : importDone ? "Importiert ✓" : "Backup hochladen"}
            </label>
          </div>
        </div>
      </div>

      {/* ── Total Reset ─────────────────────────────────────────────────────── */}
      <div style={{ ...cardStyle, border: resetPhase !== "idle" ? "1px solid rgba(239,68,68,0.35)" : "1px solid hsl(0 0% 13%)" }}>
        {resetPhase === "idle" && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" width="18" height="18">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "hsl(0 0% 85%)", marginBottom: 3 }}>Total Reset</div>
              <div style={{ fontSize: "0.72rem", color: "hsl(0 0% 40%)", lineHeight: 1.5, marginBottom: 14 }}>
                Löscht restlos alle eingetragenen Daten. Diese Aktion kann nicht rückgängig gemacht werden.
              </div>
              <button
                onClick={() => setResetPhase("warn")}
                style={{ padding: "9px 18px", borderRadius: 8, border: "none", cursor: "pointer", background: "rgba(239,68,68,0.12)", color: "#ef4444", fontSize: "0.78rem", fontWeight: 600, outline: "1px solid rgba(239,68,68,0.25)", WebkitTapHighlightColor: "transparent" as any }}
              >
                Alle Daten löschen
              </button>
            </div>
          </div>
        )}

        {resetPhase === "warn" && (
          <div>
            {/* Big warning */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" width="18" height="18">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#ef4444", marginBottom: 2 }}>Achtung — nicht rückgängig!</div>
                <div style={{ fontSize: "0.7rem", color: "hsl(0 0% 45%)" }}>Alle Daten werden permanent gelöscht</div>
              </div>
            </div>

            <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", marginBottom: 16 }}>
              <div style={{ fontSize: "0.72rem", color: "hsl(0 0% 50%)", lineHeight: 1.7 }}>
                <div style={{ fontWeight: 600, color: "hsl(0 0% 60%)", marginBottom: 4 }}>Folgendes wird gelöscht:</div>
                Finanzen · Sparkonto · Fixkosten · Ausgaben · TikTok-Posts · Content-Ideen · Date-Ideen · Notizen · Haushalt · Training PR · Einkaufsliste · Countdowns · Kalender · Urlaubstage
              </div>
            </div>

            <div style={{ fontSize: "0.72rem", color: "hsl(0 0% 40%)", marginBottom: 16 }}>
              Erstell vorher ein <button onClick={handleExport} style={{ background: "none", border: "none", color: "#4ade80", cursor: "pointer", fontSize: "0.72rem", padding: 0, textDecoration: "underline" }}>Backup</button>, falls du die Daten noch brauchst.
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={cancelReset} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid hsl(0 0% 18%)", background: "hsl(0 0% 10%)", color: "hsl(0 0% 55%)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                Abbrechen
              </button>
              <button onClick={() => setResetPhase("code")} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "rgba(239,68,68,0.15)", color: "#ef4444", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", outline: "1px solid rgba(239,68,68,0.3)" }}>
                Ja, weiter
              </button>
            </div>
          </div>
        )}

        {resetPhase === "code" && (
          <div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "hsl(0 0% 80%)", marginBottom: 6 }}>Sicherheitscode eingeben</div>
            <div style={{ fontSize: "0.72rem", color: "hsl(0 0% 40%)", marginBottom: 14, lineHeight: 1.5 }}>
              Gib deinen Code ein, um den Reset zu bestätigen.
            </div>
            <input
              type="password"
              inputMode="numeric"
              value={resetCode}
              onChange={e => { setResetCode(e.target.value); setCodeError(false); }}
              onKeyDown={e => e.key === "Enter" && handleResetConfirmCode()}
              placeholder="Code eingeben"
              autoFocus
              style={{
                width: "100%", padding: "11px 14px", borderRadius: 8, fontSize: "1rem",
                background: codeError ? "rgba(239,68,68,0.08)" : "hsl(0 0% 10%)",
                border: codeError ? "1.5px solid rgba(239,68,68,0.6)" : "1px solid hsl(0 0% 18%)",
                color: "hsl(0 0% 88%)", outline: "none", boxSizing: "border-box",
                transition: "border-color 0.15s",
                marginBottom: codeError ? 6 : 14,
              }}
            />
            {codeError && (
              <div style={{ fontSize: "0.7rem", color: "#ef4444", marginBottom: 10 }}>Falscher Code. Versuch es nochmal.</div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={cancelReset} style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid hsl(0 0% 18%)", background: "hsl(0 0% 10%)", color: "hsl(0 0% 55%)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                Abbrechen
              </button>
              <button
                onClick={handleResetConfirmCode}
                disabled={resetting || !resetCode}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: resetting ? "hsl(0 0% 12%)" : "rgba(239,68,68,0.2)", color: resetting ? "hsl(0 0% 40%)" : "#ef4444", fontSize: "0.78rem", fontWeight: 600, cursor: resetting ? "not-allowed" : "pointer", outline: "1px solid rgba(239,68,68,0.3)" }}
              >
                {resetting ? "Wird gelöscht…" : "Jetzt löschen"}
              </button>
            </div>
          </div>
        )}

        {resetPhase === "done" && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: 6 }}>🗑️</div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "hsl(0 0% 70%)" }}>Alle Daten gelöscht</div>
            <div style={{ fontSize: "0.7rem", color: "hsl(0 0% 38%)", marginTop: 4 }}>Seite wird neu geladen…</div>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ marginTop: 14, padding: "14px", borderRadius: 10, background: "hsl(0 0% 6%)", border: "1px solid hsl(0 0% 11%)" }}>
        <div style={{ fontSize: "0.68rem", color: "hsl(0 0% 32%)", lineHeight: 1.7 }}>
          <div style={{ color: "hsl(0 0% 42%)", fontWeight: 600, marginBottom: 4 }}>Was wird gespeichert?</div>
          Finanzen · Sparkonto · Fixkosten · Ausgaben · TikTok-Posts · Content-Ideen · Date-Ideen · Notizen · Haushalt · Training PR · Einkaufsliste · Countdowns · Kalender · Urlaubstage
        </div>
      </div>
    </div>
  );
}
