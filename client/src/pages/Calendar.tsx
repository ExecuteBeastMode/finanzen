import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { VacationConfig } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────
type Category = "urlaub" | "schulung" | "krank";

interface CalEntry {
  id: number;
  date: string;
  year: number;
  category: Category;
  note: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS_FULL = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const DOW_SHORT   = ["Mo","Di","Mi","Do","Fr","Sa","So"];
const BASE_YEARS  = Array.from({ length: 10 }, (_, i) => 2024 + i); // 2024–2033

const CAT: Record<Category, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  urlaub:   { label: "Urlaub",   color: "#4ade80", bg: "rgba(74,222,128,0.18)",  border: "rgba(74,222,128,0.4)",  emoji: "✈️" },
  schulung: { label: "Schulung", color: "#60a5fa", bg: "rgba(96,165,250,0.18)",  border: "rgba(96,165,250,0.4)",  emoji: "📚" },
  krank:    { label: "Krank",    color: "#f87171", bg: "rgba(248,113,113,0.18)", border: "rgba(248,113,113,0.4)", emoji: "🤒" },
};

const HOLIDAY_COLOR  = "#fbbf24";
const HOLIDAY_BG     = "rgba(251,191,36,0.14)";
const HOLIDAY_BORDER = "rgba(251,191,36,0.38)";
const WEEKEND_BG     = "rgba(255,255,255,0.025)";
const WEEKEND_COLOR  = "hsl(0 0% 50%)";

// ─── Easter (Gaussian algorithm) ─────────────────────────────────────────────
function easterSunday(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}

function dfmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// ─── Bayern Feiertage (arbeitsfrei) ───────────────────────────────────────────
function getBayernHolidays(year: number): Map<string, string> {
  const e = easterSunday(year);
  const h: [string, string][] = [
    [`${year}-01-01`, "Neujahr"],
    [`${year}-01-06`, "Heilige Drei Könige"],
    [dfmt(addDays(e, -2)), "Karfreitag"],
    [dfmt(e),              "Ostersonntag"],
    [dfmt(addDays(e, 1)),  "Ostermontag"],
    [`${year}-05-01`, "Tag der Arbeit"],
    [dfmt(addDays(e, 39)), "Christi Himmelfahrt"],
    [dfmt(addDays(e, 49)), "Pfingstsonntag"],
    [dfmt(addDays(e, 50)), "Pfingstmontag"],
    [dfmt(addDays(e, 60)), "Fronleichnam"],
    [`${year}-08-15`, "Mariä Himmelfahrt"],
    [`${year}-10-03`, "Tag der Deutschen Einheit"],
    [`${year}-11-01`, "Allerheiligen"],
    [`${year}-12-25`, "1. Weihnachtstag"],
    [`${year}-12-26`, "2. Weihnachtstag"],
  ];
  return new Map(h);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function daysInMonth(year: number, month: number): (Date | null)[] {
  const first    = new Date(year, month, 1);
  const last     = new Date(year, month + 1, 0);
  const firstDow = (first.getDay() + 6) % 7;
  const days: (Date | null)[] = [];
  for (let i = 0; i < firstDow; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

function isoWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - w1.getTime()) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
}

function formatDate(ds: string): string {
  const [y, m, d] = ds.split("-");
  return `${d}.${m}.${y}`;
}

const todayStr = localDateStr(new Date());

// ─── Component ────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const [year, setYear]           = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [showHolidays, setShowHolidays] = useState(true);
  const [showWeekends, setShowWeekends] = useState(true);

  // Extra years
  const [extraYears, setExtraYears] = useState<number[]>(() => {
    try { return JSON.parse(localStorage.getItem("lifeos_extra_years") ?? "[]"); } catch { return []; }
  });
  const [addYearInput, setAddYearInput] = useState("");
  const allYears = Array.from(new Set([...BASE_YEARS, ...extraYears])).sort((a, b) => a - b);

  // Add-form state
  const [formDate, setFormDate]   = useState(todayStr);
  const [formCat, setFormCat]     = useState<Category>("urlaub");
  const [formNote, setFormNote]   = useState("");
  const [formError, setFormError] = useState("");

  // Vacation config
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalInput, setTotalInput]     = useState("");

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: rawEntries = [] } = useQuery<any[]>({
    queryKey: ["/api/vacation", year],
    queryFn: () => apiRequest("GET", `/api/vacation/${year}`).then(r => r.json()),
  });

  const { data: vacConfig } = useQuery<VacationConfig | null>({
    queryKey: ["/api/vacation-config", year],
    queryFn: () => apiRequest("GET", `/api/vacation-config/${year}`).then(r => r.json()),
  });

  // Parse entries
  const entries: CalEntry[] = rawEntries.map((e: any) => {
    let category: Category = "urlaub";
    let note: string | null = null;
    if (e.note && e.note.startsWith("cat:")) {
      const parts = e.note.split("|");
      const catPart = parts[0].replace("cat:", "");
      if (catPart === "schulung" || catPart === "krank" || catPart === "urlaub") category = catPart;
      note = parts[1] ?? null;
    }
    return { id: e.id, date: e.date, year: e.year, category, note };
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const addMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/vacation", d).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/vacation", year] }),
  });
  const delMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/vacation/${id}`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/vacation", year] }),
  });
  const setConfigMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/vacation-config", d).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/vacation-config", year] }); setEditingTotal(false); },
  });

  // ── Derived ──────────────────────────────────────────────────────────────────
  const byDate = new Map<string, CalEntry[]>();
  for (const e of entries) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date)!.push(e);
  }

  // Holidays for current year (+ extra years)
  const yearHolidays = getBayernHolidays(year);
  for (const ey of extraYears) {
    for (const [d, n] of getBayernHolidays(ey)) yearHolidays.set(d, n);
  }
  // only keep current year
  const currentYearHolidays = getBayernHolidays(year);

  const urlaubCount  = entries.filter(e => e.category === "urlaub").length;
  const totalDays    = vacConfig?.totalDays ?? 30;
  const remainUrlaub = totalDays - urlaubCount;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleAdd = () => {
    setFormError("");
    if (!formDate) { setFormError("Datum auswählen"); return; }
    const entryYear = parseInt(formDate.split("-")[0]);
    const noteStr   = `cat:${formCat}${formNote ? "|" + formNote : ""}`;
    addMut.mutate({ year: entryYear, date: formDate, note: noteStr });
    setFormNote("");
  };

  const handleAddYear = () => {
    const y = parseInt(addYearInput, 10);
    if (isNaN(y) || y < 2000 || y > 2100) return;
    if (allYears.includes(y)) return;
    const next = [...extraYears, y];
    setExtraYears(next);
    localStorage.setItem("lifeos_extra_years", JSON.stringify(next));
    setYear(y);
    setAddYearInput("");
  };

  // ── Calendar grid ─────────────────────────────────────────────────────────────
  const days = daysInMonth(year, viewMonth);
  const weeks: { kw: number; days: (Date | null)[] }[] = [];
  let row: (Date | null)[] = [];
  let currentKW = -1;
  days.forEach((d, i) => {
    if (i % 7 === 0) {
      if (row.length) weeks.push({ kw: currentKW, days: row });
      row = [];
      const first = days.slice(i, i + 7).find(x => x !== null);
      currentKW = first ? isoWeek(first) : -1;
    }
    row.push(d);
  });
  if (row.length) { while (row.length < 7) row.push(null); weeks.push({ kw: currentKW, days: row }); }

  // Feiertage dieses Monats
  const monthHolidays = Array.from(currentYearHolidays.entries())
    .filter(([date]) => date.startsWith(`${year}-${String(viewMonth+1).padStart(2,"0")}`))
    .sort(([a],[b]) => a.localeCompare(b));

  const inputStyle: React.CSSProperties = {
    padding: "9px 12px", borderRadius: 9, background: "hsl(0 0% 8%)",
    border: "1px solid hsl(0 0% 16%)", color: "hsl(0 0% 88%)",
    fontSize: "0.85rem", outline: "none", width: "100%", boxSizing: "border-box",
  };

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setYear(y => y+1); } else setViewMonth(m => m+1); };

  // Toggle button style helper
  const toggleBtn = (active: boolean, activeColor: string, activeBg: string, activeBorder: string): React.CSSProperties => ({
    padding: "5px 11px", borderRadius: 99, cursor: "pointer", fontWeight: 600,
    fontSize: "0.68rem", transition: "all 0.15s",
    border: `1px solid ${active ? activeBorder : "hsl(0 0% 16%)"}`,
    background: active ? activeBg : "hsl(0 0% 8%)",
    color: active ? activeColor : "hsl(0 0% 32%)",
  });

  return (
    <div style={{ padding: "20px 16px 100px", maxWidth: 560, margin: "0 auto" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 10 }}>
        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 700, color: "hsl(0 0% 92%)", letterSpacing: "-0.02em", marginBottom: 2 }}>Kalender</h1>
          <p style={{ fontSize: "0.72rem", color: "hsl(0 0% 40%)" }}>Urlaub · Schulung · Krank · Bayern</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{ ...inputStyle, width: "auto", fontWeight: 700, fontSize: "0.95rem", padding: "7px 10px" }}
          >
            {allYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div style={{ display: "flex", gap: 5 }}>
            <input
              type="number"
              value={addYearInput}
              onChange={e => setAddYearInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddYear()}
              placeholder="Jahr..."
              style={{ ...inputStyle, width: 78, textAlign: "center", fontSize: "0.75rem", padding: "5px 8px" }}
            />
            <button onClick={handleAddYear}
              style={{ padding: "5px 11px", borderRadius: 7, border: "none", cursor: "pointer", background: "rgba(74,222,128,0.12)", color: "#4ade80", fontSize: "0.75rem", fontWeight: 600, outline: "1px solid rgba(74,222,128,0.22)", WebkitTapHighlightColor: "transparent" as any }}
            >+</button>
          </div>
        </div>
      </div>

      {/* ── Toggle Buttons ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        <button
          onClick={() => setShowHolidays(v => !v)}
          style={toggleBtn(showHolidays, HOLIDAY_COLOR, "rgba(251,191,36,0.1)", HOLIDAY_BORDER)}
        >
          🎉 Feiertage {showHolidays ? "ein" : "aus"}
        </button>
        <button
          onClick={() => setShowWeekends(v => !v)}
          style={toggleBtn(showWeekends, WEEKEND_COLOR, "rgba(255,255,255,0.04)", "hsl(0 0% 20%)")}
        >
          📅 Wochenenden {showWeekends ? "ein" : "aus"}
        </button>
      </div>

      {/* ── Stats bar ──────────────────────────────────────────────────────── */}
      <div className="wd-card-fancy" style={{ padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 14 }}>
            {(["urlaub","schulung","krank"] as Category[]).map(cat => (
              <div key={cat} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: CAT[cat].color }}>
                  {entries.filter(e => e.category === cat).length}
                </div>
                <div style={{ fontSize: "0.6rem", color: "hsl(0 0% 38%)" }}>{CAT[cat].label}</div>
              </div>
            ))}
            {showHolidays && (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: HOLIDAY_COLOR }}>
                  {currentYearHolidays.size}
                </div>
                <div style={{ fontSize: "0.6rem", color: "hsl(0 0% 38%)" }}>Feiertage</div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.7rem", color: "hsl(0 0% 40%)" }}>Urlaubstage gesamt</div>
              <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "hsl(0 0% 70%)" }}>
                {urlaubCount} / {totalDays} &nbsp;
                <span style={{ color: remainUrlaub < 0 ? "#f87171" : "#4ade80" }}>({remainUrlaub} übrig)</span>
              </div>
            </div>
            <button
              onClick={() => { setTotalInput(String(totalDays)); setEditingTotal(true); }}
              style={{ padding: "4px 9px", borderRadius: 6, background: "hsl(0 0% 11%)", border: "1px solid hsl(0 0% 18%)", color: "hsl(0 0% 50%)", cursor: "pointer", fontSize: "0.68rem" }}
            >✏️</button>
          </div>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: "hsl(0 0% 12%)", overflow: "hidden", marginTop: 12 }}>
          <div style={{ height: "100%", borderRadius: 3, background: urlaubCount >= totalDays ? "#f87171" : "#4ade80", width: `${Math.min(100, (urlaubCount / Math.max(1, totalDays)) * 100)}%`, transition: "width 0.3s" }} />
        </div>
        {editingTotal && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
            <span style={{ fontSize: "0.78rem", color: "hsl(0 0% 55%)" }}>Gesamt Urlaubstage:</span>
            <input type="number" value={totalInput} onChange={e => setTotalInput(e.target.value)}
              autoFocus onKeyDown={e => e.key === "Enter" && setConfigMut.mutate({ year, totalDays: parseInt(totalInput) || 30 })}
              style={{ ...inputStyle, width: 65, textAlign: "center", padding: "5px 8px", fontSize: "0.9rem" }}
            />
            <button onClick={() => setConfigMut.mutate({ year, totalDays: parseInt(totalInput) || 30 })}
              style={{ padding: "5px 12px", borderRadius: 7, background: "#4ade80", border: "none", color: "#0a0a0a", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>OK</button>
            <button onClick={() => setEditingTotal(false)}
              style={{ padding: "5px 8px", borderRadius: 7, background: "hsl(0 0% 11%)", border: "1px solid hsl(0 0% 18%)", color: "hsl(0 0% 50%)", fontSize: "0.78rem", cursor: "pointer" }}>✕</button>
          </div>
        )}
      </div>

      {/* ── Add entry form ─────────────────────────────────────────────────── */}
      <div className="wd-card" style={{ padding: "16px", marginBottom: 16 }}>
        <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "hsl(0 0% 45%)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          Eintrag hinzufügen
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)}
            style={{ ...inputStyle, flex: "1 1 140px", colorScheme: "dark" as any }} />
          <div style={{ display: "flex", gap: 5, flex: "1 1 auto" }}>
            {(["urlaub","schulung","krank"] as Category[]).map(cat => (
              <button key={cat} onClick={() => setFormCat(cat)}
                style={{
                  flex: 1, padding: "9px 4px", borderRadius: 9, border: "none", cursor: "pointer",
                  background: formCat === cat ? CAT[cat].bg : "hsl(0 0% 9%)",
                  color: formCat === cat ? CAT[cat].color : "hsl(0 0% 45%)",
                  fontSize: "0.72rem", fontWeight: 600,
                  outline: formCat === cat ? `1px solid ${CAT[cat].border}` : "1px solid hsl(0 0% 14%)",
                  transition: "all 0.12s", WebkitTapHighlightColor: "transparent" as any,
                }}
              >{CAT[cat].emoji} {CAT[cat].label}</button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="text" value={formNote} onChange={e => setFormNote(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="Notiz (optional)" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={handleAdd} disabled={addMut.isPending}
            style={{
              padding: "9px 18px", borderRadius: 9, border: "none", cursor: "pointer",
              background: "rgba(74,222,128,0.15)", color: "#4ade80",
              fontSize: "0.85rem", fontWeight: 700, outline: "1px solid rgba(74,222,128,0.3)",
              WebkitTapHighlightColor: "transparent" as any, flexShrink: 0,
            }}>+</button>
        </div>
        {formError && <div style={{ fontSize: "0.7rem", color: "#f87171", marginTop: 6 }}>{formError}</div>}
      </div>

      {/* ── Calendar nav ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <button onClick={prevMonth} style={{ width: 38, height: 38, borderRadius: 9, background: "hsl(0 0% 10%)", border: "1px solid hsl(0 0% 17%)", color: "hsl(0 0% 65%)", cursor: "pointer", fontSize: "1.1rem", WebkitTapHighlightColor: "transparent" as any }}>‹</button>
        <span style={{ fontSize: "1rem", fontWeight: 700, color: "hsl(0 0% 88%)" }}>{MONTHS_FULL[viewMonth]} {year}</span>
        <button onClick={nextMonth} style={{ width: 38, height: 38, borderRadius: 9, background: "hsl(0 0% 10%)", border: "1px solid hsl(0 0% 17%)", color: "hsl(0 0% 65%)", cursor: "pointer", fontSize: "1.1rem", WebkitTapHighlightColor: "transparent" as any }}>›</button>
      </div>

      {/* ── Calendar grid ──────────────────────────────────────────────────── */}
      <div className="wd-card-fancy" style={{ padding: "10px 8px 12px", marginBottom: 16 }}>
        {/* Header row */}
        <div style={{ display: "grid", gridTemplateColumns: "28px repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
          <div />
          {DOW_SHORT.map((d, i) => (
            <div key={d} style={{
              fontSize: "0.58rem", fontWeight: 600,
              color: i >= 5 && showWeekends ? WEEKEND_COLOR : "hsl(0 0% 35%)",
              textAlign: "center", letterSpacing: "0.04em",
            }}>{d}</div>
          ))}
        </div>

        {weeks.map((row, ri) => (
          <div key={ri} style={{ display: "grid", gridTemplateColumns: "28px repeat(7, 1fr)", gap: 2, marginBottom: 2 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 36 }}>
              <span style={{ fontSize: "0.55rem", color: "hsl(0 0% 28%)" }}>{row.kw > 0 ? row.kw : ""}</span>
            </div>
            {row.days.map((day, di) => {
              if (!day) return <div key={di} style={{ height: 36 }} />;
              const ds          = localDateStr(day);
              const dayEntries  = byDate.get(ds) ?? [];
              const holidayName = showHolidays ? currentYearHolidays.get(ds) : undefined;
              const isToday     = ds === todayStr;
              const isWeekend   = di >= 5;

              const firstCat = dayEntries[0]?.category;
              const catStyle = firstCat ? CAT[firstCat] : null;
              const isHoliday = !!holidayName && !catStyle;
              const showWknd  = isWeekend && showWeekends && !catStyle && !isHoliday;

              const bgColor =
                catStyle   ? catStyle.bg   :
                isHoliday  ? HOLIDAY_BG    :
                showWknd   ? WEEKEND_BG    : "transparent";

              const borderStyle =
                isToday    ? "1.5px solid rgba(74,222,128,0.7)" :
                catStyle   ? `1px solid ${catStyle.border}`     :
                isHoliday  ? `1px solid ${HOLIDAY_BORDER}`      :
                showWknd   ? "1px solid hsl(0 0% 13%)"          : "1px solid transparent";

              const textColor =
                catStyle   ? catStyle.color :
                isToday    ? "#4ade80"       :
                isHoliday  ? HOLIDAY_COLOR   :
                isWeekend  ? WEEKEND_COLOR   : "hsl(0 0% 78%)";

              return (
                <div
                  key={di}
                  title={holidayName ?? (isWeekend ? "Wochenende" : undefined)}
                  style={{
                    height: 36, borderRadius: 6,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                    background: bgColor, border: borderStyle,
                    position: "relative", cursor: "default", userSelect: "none",
                  }}
                >
                  <span style={{ fontSize: "0.78rem", fontWeight: isToday ? 700 : isHoliday ? 600 : 400, color: textColor, lineHeight: 1 }}>
                    {day.getDate()}
                  </span>
                  {dayEntries.length > 1 && (
                    <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                      {dayEntries.slice(0,3).map((e, i) => (
                        <span key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: CAT[e.category].color }} />
                      ))}
                    </div>
                  )}
                  {dayEntries.length === 1 && (
                    <span style={{ fontSize: "0.35rem", lineHeight: 1 }}>{CAT[firstCat!].emoji}</span>
                  )}
                  {isHoliday && (
                    <span style={{ fontSize: "0.35rem", lineHeight: 1 }}>🎉</span>
                  )}
                  {/* Feiertag dot wenn user-Eintrag drüber liegt */}
                  {catStyle && holidayName && showHolidays && (
                    <span style={{ position: "absolute", top: 3, right: 3, width: 4, height: 4, borderRadius: "50%", background: HOLIDAY_COLOR }} />
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Legend */}
        <div style={{ display: "flex", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid hsl(0 0% 11%)", flexWrap: "wrap", alignItems: "center" }}>
          {(["urlaub","schulung","krank"] as Category[]).map(cat => (
            <span key={cat} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.58rem", color: "hsl(0 0% 40%)" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: CAT[cat].bg, border: `1px solid ${CAT[cat].border}`, display: "inline-block" }} />
              {CAT[cat].label}
            </span>
          ))}
          {showHolidays && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.58rem", color: "hsl(0 0% 40%)" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: HOLIDAY_BG, border: `1px solid ${HOLIDAY_BORDER}`, display: "inline-block" }} />
              Feiertag
            </span>
          )}
          {showWeekends && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.58rem", color: "hsl(0 0% 40%)" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: WEEKEND_BG, border: "1px solid hsl(0 0% 14%)", display: "inline-block" }} />
              Wochenende
            </span>
          )}
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.58rem", color: "hsl(0 0% 40%)" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "transparent", border: "1.5px solid rgba(74,222,128,0.7)", display: "inline-block" }} />
            Heute
          </span>
        </div>
      </div>

      {/* ── Feiertage dieses Monats ─────────────────────────────────────────── */}
      {showHolidays && monthHolidays.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "hsl(0 0% 35%)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            🎉 Feiertage {MONTHS_FULL[viewMonth]}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {monthHolidays.map(([date, name]) => (
              <div key={date} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 14px", borderRadius: 10,
                background: HOLIDAY_BG, border: `1px solid ${HOLIDAY_BORDER}`,
              }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 600, color: HOLIDAY_COLOR }}>{formatDate(date)}</span>
                <span style={{ fontSize: "0.78rem", color: "hsl(0 0% 65%)" }}>{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Alle Feiertage des Jahres ──────────────────────────────────────── */}
      {showHolidays && (
        <details style={{ marginBottom: 16 }}>
          <summary style={{
            fontSize: "0.68rem", fontWeight: 600, color: "hsl(0 0% 35%)",
            textTransform: "uppercase", letterSpacing: "0.08em",
            cursor: "pointer", padding: "6px 0", userSelect: "none", listStyle: "none",
          }}>
            📅 Alle {currentYearHolidays.size} Feiertage {year} (Bayern) ▾
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
            {Array.from(currentYearHolidays.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([date, name]) => (
              <div key={date} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 14px", borderRadius: 9,
                background: "hsl(0 0% 7%)", border: "1px solid hsl(0 0% 13%)",
              }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: HOLIDAY_COLOR }}>{formatDate(date)}</span>
                <span style={{ fontSize: "0.74rem", color: "hsl(0 0% 60%)" }}>{name}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* ── Entries list ───────────────────────────────────────────────────── */}
      {entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "28px 0", color: "hsl(0 0% 30%)", fontSize: "0.8rem" }}>
          Noch keine Einträge für {year}
        </div>
      ) : (
        <div>
          <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "hsl(0 0% 35%)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
            Alle Einträge {year}
          </div>
          {(["urlaub","schulung","krank"] as Category[]).map(cat => {
            const catEntries = entries.filter(e => e.category === cat).sort((a,b) => a.date.localeCompare(b.date));
            if (catEntries.length === 0) return null;
            return (
              <div key={cat} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: CAT[cat].color, letterSpacing: "0.04em" }}>
                    {CAT[cat].emoji} {CAT[cat].label.toUpperCase()} ({catEntries.length})
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {catEntries.map(entry => (
                    <div key={entry.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 14px", borderRadius: 10,
                      background: CAT[cat].bg, border: `1px solid ${CAT[cat].border}`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: CAT[cat].color }}>
                          {formatDate(entry.date)}
                        </span>
                        {showHolidays && currentYearHolidays.has(entry.date) && (
                          <span style={{ fontSize: "0.64rem", color: HOLIDAY_COLOR }}>
                            🎉 {currentYearHolidays.get(entry.date)}
                          </span>
                        )}
                        {entry.note && (
                          <span style={{ fontSize: "0.72rem", color: "hsl(0 0% 50%)" }}>{entry.note}</span>
                        )}
                      </div>
                      <button
                        onClick={() => delMut.mutate(entry.id)}
                        style={{
                          width: 28, height: 28, borderRadius: 7, background: "hsl(0 0% 8%)",
                          border: "1px solid hsl(0 0% 18%)", color: "hsl(0 0% 45%)",
                          cursor: "pointer", fontSize: "0.9rem", fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          WebkitTapHighlightColor: "transparent" as any, flexShrink: 0,
                        }}
                      >−</button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
