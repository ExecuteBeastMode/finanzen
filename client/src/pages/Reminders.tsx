import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Reminder } from "@shared/schema";

const TYPES = ["reminder", "birthday", "appointment"] as const;
const TYPE_LABELS: Record<string, string> = { reminder: "Erinnerung", birthday: "Geburtstag", appointment: "Termin" };
const TYPE_ICONS: Record<string, string> = { reminder: "🔔", birthday: "🎂", appointment: "📅" };
const TYPE_COLORS: Record<string, string> = { reminder: "#00d4ff", birthday: "#f472b6", appointment: "#fbbf24" };
const MONTHS = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

export default function RemindersPage() {
  const { toast } = useToast();
  const { data: reminders = [] } = useQuery<Reminder[]>({ queryKey: ["/api/reminders"] });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [form, setForm] = useState({ title: "", date: "", type: "reminder", recurring: false, note: "" });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const addMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/reminders", data).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/reminders"] }); setShowForm(false); resetForm(); toast({ title: "Erinnerung hinzugefügt" }); }
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PATCH", `/api/reminders/${id}`, data).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/reminders"] }); setEditingId(null); setShowForm(false); resetForm(); }
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/reminders/${id}`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/reminders"] })
  });
  const doneMut = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) => apiRequest("PATCH", `/api/reminders/${id}`, { done }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/reminders"] })
  });

  const resetForm = () => setForm({ title: "", date: "", type: "reminder", recurring: false, note: "" });

  // For birthdays (recurring), show upcoming in current year
  const getEffectiveDate = (r: Reminder): Date => {
    const d = new Date(r.date);
    if (r.recurring && r.type === "birthday") {
      const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate());
      if (thisYear < today) { thisYear.setFullYear(today.getFullYear() + 1); }
      return thisYear;
    }
    return d;
  };

  const getDaysUntil = (r: Reminder): number => {
    const eff = getEffectiveDate(r);
    return Math.ceil((eff.getTime() - today.getTime()) / 86400000);
  };

  const filtered = useMemo(() => {
    let list = reminders.filter(r => filter === "all" || r.type === filter);
    return list.sort((a, b) => getDaysUntil(a) - getDaysUntil(b));
  }, [reminders, filter]);

  const upcoming7 = reminders.filter(r => { const d = getDaysUntil(r); return d >= 0 && d <= 7 && !r.done; });
  const upcoming30 = reminders.filter(r => { const d = getDaysUntil(r); return d >= 0 && d <= 30 && !r.done; });
  const overdue = reminders.filter(r => getDaysUntil(r) < 0 && !r.done && !r.recurring);

  const startEdit = (r: Reminder) => {
    setForm({ title: r.title, date: r.date, type: r.type, recurring: r.recurring, note: r.note || "" });
    setEditingId(r.id);
    setShowForm(true);
  };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 className="section-title glow-text" style={{ fontSize: "1.4rem" }}>TERMINE & ERINNERUNGEN</h1>
        <button className="btn-cyan" onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}>+ NEU</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        <div className="wd-card" style={{ padding: "10px 14px", borderColor: overdue.length > 0 ? "rgba(239,68,68,0.4)" : undefined }}>
          <div style={{ fontSize: "0.6rem", color: "hsl(220 10% 45%)", marginBottom: 3, letterSpacing: "0.08em", textTransform: "uppercase" }}>Überfällig</div>
          <div className="mono" style={{ fontSize: "1.2rem", fontWeight: 700, color: overdue.length > 0 ? "#f87171" : "hsl(220 10% 45%)" }}>{overdue.length}</div>
        </div>
        <div className="wd-card" style={{ padding: "10px 14px" }}>
          <div style={{ fontSize: "0.6rem", color: "hsl(220 10% 45%)", marginBottom: 3, letterSpacing: "0.08em", textTransform: "uppercase" }}>Diese Woche</div>
          <div className="mono" style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fbbf24" }}>{upcoming7.length}</div>
        </div>
        <div className="wd-card" style={{ padding: "10px 14px" }}>
          <div style={{ fontSize: "0.6rem", color: "hsl(220 10% 45%)", marginBottom: 3, letterSpacing: "0.08em", textTransform: "uppercase" }}>Nächste 30 Tage</div>
          <div className="mono" style={{ fontSize: "1.2rem", fontWeight: 700, color: "#00d4ff" }}>{upcoming30.length}</div>
        </div>
        <div className="wd-card" style={{ padding: "10px 14px" }}>
          <div style={{ fontSize: "0.6rem", color: "hsl(220 10% 45%)", marginBottom: 3, letterSpacing: "0.08em", textTransform: "uppercase" }}>Gesamt</div>
          <div className="mono" style={{ fontSize: "1.2rem", fontWeight: 700, color: "hsl(195 80% 85%)" }}>{reminders.length}</div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="wd-card" style={{ padding: 20, marginBottom: 20, borderColor: "rgba(0,212,255,0.3)" }}>
          <div className="section-title" style={{ marginBottom: 14, fontSize: "0.85rem" }}>{editingId ? "BEARBEITEN" : "NEUE ERINNERUNG"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: "0.65rem", color: "hsl(220 10% 45%)", display: "block", marginBottom: 4 }}>TITEL *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Mamas Geburtstag" />
              </div>
              <div>
                <label style={{ fontSize: "0.65rem", color: "hsl(220 10% 45%)", display: "block", marginBottom: 4 }}>DATUM *</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: "0.65rem", color: "hsl(220 10% 45%)", display: "block", marginBottom: 4 }}>TYP</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, recurring: e.target.value === "birthday" }))}>
                  {TYPES.map(t => <option key={t} value={t}>{TYPE_ICONS[t]} {TYPE_LABELS[t]}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: "0.65rem", color: "hsl(220 10% 45%)", display: "block", marginBottom: 4 }}>NOTIZ</label>
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Optionale Notiz..." />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" id="recurring" checked={form.recurring} onChange={e => setForm(f => ({ ...f, recurring: e.target.checked }))} style={{ width: 16, height: 16 }} />
              <label htmlFor="recurring" style={{ fontSize: "0.78rem", color: "hsl(220 10% 55%)", cursor: "pointer" }}>Jährlich wiederholen (z.B. Geburtstage)</label>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn-danger" onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}>Abbrechen</button>
              <button className="btn-cyan" onClick={() => {
                if (!form.title || !form.date) return;
                if (editingId) { updateMut.mutate({ id: editingId, data: form }); } else { addMut.mutate(form); }
              }}>{editingId ? "Speichern" : "Hinzufügen"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <span>⚠️</span>
          <span style={{ fontSize: "0.8rem", color: "#f87171" }}>{overdue.length} überfällige Erinnerung{overdue.length > 1 ? "en" : ""}</span>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <button onClick={() => setFilter("all")} style={{ padding: "4px 12px", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "inherit", cursor: "pointer", border: "1px solid", borderColor: filter === "all" ? "rgba(0,212,255,0.4)" : "hsl(220 10% 20%)", background: filter === "all" ? "rgba(0,212,255,0.12)" : "transparent", color: filter === "all" ? "#00d4ff" : "hsl(220 10% 50%)", borderRadius: 4 }}>Alle</button>
        {TYPES.map(t => (
          <button key={t} onClick={() => setFilter(filter === t ? "all" : t)} style={{ padding: "4px 12px", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "inherit", cursor: "pointer", border: "1px solid", borderColor: filter === t ? TYPE_COLORS[t] + "60" : "hsl(220 10% 20%)", background: filter === t ? TYPE_COLORS[t] + "20" : "transparent", color: filter === t ? TYPE_COLORS[t] : "hsl(220 10% 50%)", borderRadius: 4 }}>
            {TYPE_ICONS[t]} {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(r => {
          const daysUntil = getDaysUntil(r);
          const effDate = getEffectiveDate(r);
          const typeColor = TYPE_COLORS[r.type];
          const isOverdue = daysUntil < 0 && !r.recurring;
          const isToday = daysUntil === 0;
          const isThisWeek = daysUntil > 0 && daysUntil <= 7;

          return (
            <div key={r.id} className="wd-card" style={{ padding: "12px 16px", opacity: r.done ? 0.5 : 1, borderColor: isOverdue ? "rgba(239,68,68,0.4)" : isToday ? typeColor + "60" : undefined }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" checked={r.done} onChange={e => doneMut.mutate({ id: r.id, done: e.target.checked })} />
                <span style={{ fontSize: "1.2rem" }}>{TYPE_ICONS[r.type]}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: "0.88rem", fontWeight: 700, textDecoration: r.done ? "line-through" : "none" }}>{r.title}</span>
                    <span style={{ fontSize: "0.65rem", padding: "1px 6px", borderRadius: 3, background: typeColor + "20", color: typeColor, border: `1px solid ${typeColor}40` }}>{TYPE_LABELS[r.type]}</span>
                    {r.recurring && <span className="wd-tag" style={{ fontSize: "0.6rem" }}>↻ jährlich</span>}
                  </div>
                  {r.note && <div style={{ fontSize: "0.72rem", color: "hsl(220 10% 50%)" }}>{r.note}</div>}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 600, color: isOverdue ? "#f87171" : isToday ? "#fbbf24" : isThisWeek ? "#10b981" : "hsl(220 10% 55%)" }}>
                    {isOverdue ? `${Math.abs(daysUntil)}d überfällig` : isToday ? "Heute!" : `in ${daysUntil} Tag${daysUntil === 1 ? "" : "en"}`}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "hsl(220 10% 40%)" }}>
                    {effDate.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  <button className="btn-cyan" style={{ padding: "3px 8px", fontSize: "0.65rem" }} onClick={() => startEdit(r)}>✎</button>
                  <button className="btn-danger" style={{ padding: "3px 8px", fontSize: "0.65rem" }} onClick={() => deleteMut.mutate(r.id)}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="wd-card" style={{ padding: 20, textAlign: "center", color: "hsl(220 10% 40%)", fontSize: "0.85rem" }}>Keine Erinnerungen vorhanden</div>
        )}
      </div>
    </div>
  );
}
