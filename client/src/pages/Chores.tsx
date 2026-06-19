import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Chore = {
  id: number;
  title: string;
  category: string;
  frequency: string;
  lastDone: string | null;
  nextDue: string | null;
  done: boolean;
  note: string | null;
  priority: string;
};

const CATEGORIES = ["allgemein","küche","bad","wohnzimmer","draußen","wäsche","einkauf"] as const;
const CAT_LABELS: Record<string, string> = {
  allgemein: "Allgemein", küche: "Küche", bad: "Bad", wohnzimmer: "Wohnzimmer",
  draußen: "Draußen", wäsche: "Wäsche", einkauf: "Einkauf",
};
const CAT_ICONS: Record<string, string> = {
  allgemein: "🏠", küche: "🍳", bad: "🚿", wohnzimmer: "🛋️",
  draußen: "🌿", wäsche: "👕", einkauf: "🛒",
};
const FREQUENCIES: Record<string, string> = {
  daily: "Täglich", weekly: "Wöchentlich", biweekly: "2× wöchentlich",
  monthly: "Monatlich", asNeeded: "Bei Bedarf",
};
const PRIORITY_COLORS: Record<string, string> = { low: "#9ca3af", medium: "#fbbf24", high: "#f87171" };
const PRIORITY_LABELS: Record<string, string> = { low: "Niedrig", medium: "Mittel", high: "Hoch" };

function isDue(chore: Chore): boolean {
  if (chore.done) return false;
  if (!chore.nextDue) return true;
  return new Date(chore.nextDue) <= new Date();
}

function nextDueDate(frequency: string): string {
  const d = new Date();
  switch (frequency) {
    case "daily":     d.setDate(d.getDate() + 1); break;
    case "weekly":    d.setDate(d.getDate() + 7); break;
    case "biweekly":  d.setDate(d.getDate() + 3); break;
    case "monthly":   d.setMonth(d.getMonth() + 1); break;
    default: return "";
  }
  return d.toISOString().slice(0, 10);
}

export default function ChoresPage() {
  const { toast } = useToast();
  const { data: chores = [] } = useQuery<Chore[]>({ queryKey: ["/api/chores"] });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [filterDone, setFilterDone] = useState<"all" | "open" | "done">("open");
  const [form, setForm] = useState({ title: "", category: "allgemein", frequency: "weekly", priority: "medium", note: "" });

  const addMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/chores", d).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/chores"] }); setShowForm(false); resetForm(); toast({ title: "Aufgabe hinzugefügt ✓" }); }
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PATCH", `/api/chores/${id}`, data).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/chores"] }); setEditingId(null); setShowForm(false); resetForm(); }
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/chores/${id}`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/chores"] })
  });
  const doneMut = useMutation({
    mutationFn: ({ id, done, freq }: { id: number; done: boolean; freq: string }) =>
      apiRequest("PATCH", `/api/chores/${id}`, {
        done,
        lastDone: done ? new Date().toISOString().slice(0, 10) : null,
        nextDue: done ? nextDueDate(freq) : null,
      }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/chores"] })
  });

  const resetForm = () => setForm({ title: "", category: "allgemein", frequency: "weekly", priority: "medium", note: "" });

  const startEdit = (c: Chore) => {
    setForm({ title: c.title, category: c.category, frequency: c.frequency, priority: c.priority, note: c.note || "" });
    setEditingId(c.id);
    setShowForm(true);
  };

  const filtered = chores.filter(c => {
    if (filterCat !== "all" && c.category !== filterCat) return false;
    if (filterDone === "open") return !c.done;
    if (filterDone === "done") return c.done;
    return true;
  }).sort((a, b) => {
    // due items first, then by priority
    const aDue = isDue(a) ? 0 : 1;
    const bDue = isDue(b) ? 0 : 1;
    if (aDue !== bDue) return aDue - bDue;
    const pOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return (pOrder[a.priority] ?? 1) - (pOrder[b.priority] ?? 1);
  });

  // Group by category
  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = filtered.filter(c => c.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<string, Chore[]>);

  const dueCount = chores.filter(c => isDue(c)).length;
  const doneCount = chores.filter(c => c.done).length;
  const totalCount = chores.length;

  const fmt = (d: string) => new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

  return (
    <div style={{ padding: "22px 24px 32px", maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 className="page-heading">Haushalt</h1>
          <p style={{ fontSize: "0.72rem", color: "hsl(0 0% 35%)", marginTop: 2 }}>
            {dueCount > 0 ? `${dueCount} Aufgabe${dueCount > 1 ? "n" : ""} fällig` : "Alles erledigt 🎉"}
          </p>
        </div>
        <button className="btn-cyan" onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}>
          + Aufgabe
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Gesamt", value: totalCount, color: "hsl(0 0% 72%)" },
          { label: "Fällig", value: dueCount, color: dueCount > 0 ? "#f87171" : "hsl(0 0% 45%)" },
          { label: "Erledigt", value: doneCount, color: "#4ade80" },
        ].map(s => (
          <div key={s.label} className="wd-card-fancy" style={{ padding: "12px 14px" }}>
            <div className="section-title" style={{ marginBottom: 4 }}>{s.label}</div>
            <div className="mono" style={{ fontSize: "1.4rem", fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {/* Done filter */}
        <div className="pill-tab-bar">
          {(["open","done","all"] as const).map(f => (
            <button key={f} className={`pill-tab ${filterDone === f ? "active" : ""}`} onClick={() => setFilterDone(f)}>
              {f === "open" ? "Offen" : f === "done" ? "Erledigt" : "Alle"}
            </button>
          ))}
        </div>
        {/* Category filter */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <button onClick={() => setFilterCat("all")} style={{ padding: "4px 10px", fontSize: "0.68rem", fontWeight: 500, fontFamily: "inherit", cursor: "pointer", border: "1px solid", borderRadius: 5, borderColor: filterCat === "all" ? "hsl(0 0% 22%)" : "hsl(0 0% 13%)", background: filterCat === "all" ? "hsl(0 0% 12%)" : "transparent", color: filterCat === "all" ? "hsl(0 0% 80%)" : "hsl(0 0% 38%)" }}>
            Alle
          </button>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilterCat(filterCat === cat ? "all" : cat)} style={{ padding: "4px 10px", fontSize: "0.68rem", fontWeight: 500, fontFamily: "inherit", cursor: "pointer", border: "1px solid", borderRadius: 5, borderColor: filterCat === cat ? "hsl(0 0% 22%)" : "hsl(0 0% 13%)", background: filterCat === cat ? "hsl(0 0% 12%)" : "transparent", color: filterCat === cat ? "hsl(0 0% 80%)" : "hsl(0 0% 38%)" }}>
              {CAT_ICONS[cat]} {CAT_LABELS[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="wd-card-fancy" style={{ padding: 18, marginBottom: 18, borderColor: "rgba(74,222,128,0.18)" }}>
          <div className="section-title" style={{ marginBottom: 14 }}>{editingId ? "Aufgabe bearbeiten" : "Neue Aufgabe"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: "0.62rem", color: "hsl(0 0% 35%)", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Aufgabe *</div>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Badezimmer putzen" />
              </div>
              <div>
                <div style={{ fontSize: "0.62rem", color: "hsl(0 0% 35%)", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Kategorie</div>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {CAT_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: "0.62rem", color: "hsl(0 0% 35%)", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Häufigkeit</div>
                <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                  {Object.entries(FREQUENCIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: "0.62rem", color: "hsl(0 0% 35%)", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Priorität</div>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  <option value="low">Niedrig</option>
                  <option value="medium">Mittel</option>
                  <option value="high">Hoch</option>
                </select>
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.62rem", color: "hsl(0 0% 35%)", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Notiz</div>
              <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="Optional..." />
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn-danger" onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}>Abbrechen</button>
              <button className="btn-cyan" onClick={() => {
                if (!form.title) return;
                if (editingId) { updateMut.mutate({ id: editingId, data: form }); }
                else { addMut.mutate(form); }
              }}>{editingId ? "Speichern" : "Hinzufügen"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Chores grouped */}
      {Object.keys(grouped).length === 0 && (
        <div className="wd-card-fancy" style={{ padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: 10 }}>✨</div>
          <div style={{ color: "hsl(0 0% 35%)", fontSize: "0.85rem" }}>Keine Aufgaben — alles sauber!</div>
        </div>
      )}

      {(filterCat !== "all" ? [filterCat] : Object.keys(grouped)).map(cat => {
        const items = grouped[cat];
        if (!items || items.length === 0) return null;
        return (
          <div key={cat} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: "0.85rem" }}>{CAT_ICONS[cat]}</span>
              <span className="section-title">{CAT_LABELS[cat]}</span>
              <span style={{ fontSize: "0.65rem", color: "hsl(0 0% 28%)" }}>({items.length})</span>
            </div>
            <div className="wd-card-fancy" style={{ overflow: "hidden" }}>
              {items.map((chore, idx) => {
                const due = isDue(chore);
                return (
                  <div
                    key={chore.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 14px",
                      borderBottom: idx < items.length - 1 ? "1px solid hsl(0 0% 10%)" : "none",
                      background: chore.done ? "transparent" : due ? "rgba(248,113,113,0.03)" : "transparent",
                      transition: "background 0.1s",
                    }}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={chore.done}
                      onChange={e => doneMut.mutate({ id: chore.id, done: e.target.checked, freq: chore.frequency })}
                      style={{ flexShrink: 0 }}
                    />

                    {/* Info */}
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 500, color: chore.done ? "hsl(0 0% 32%)" : "hsl(0 0% 82%)", textDecoration: chore.done ? "line-through" : "none" }}>
                          {chore.title}
                        </span>
                        {/* Priority dot */}
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: PRIORITY_COLORS[chore.priority], display: "inline-block", flexShrink: 0 }} />
                        {due && !chore.done && (
                          <span style={{ fontSize: "0.6rem", padding: "1px 6px", borderRadius: 3, background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
                            Fällig
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: "0.66rem", color: "hsl(0 0% 32%)" }}>{FREQUENCIES[chore.frequency]}</span>
                        {chore.lastDone && <span style={{ fontSize: "0.64rem", color: "hsl(0 0% 27%)" }}>Zuletzt: {fmt(chore.lastDone)}</span>}
                        {chore.nextDue && !chore.done && <span style={{ fontSize: "0.64rem", color: new Date(chore.nextDue) < new Date() ? "#f87171" : "hsl(0 0% 30%)" }}>Nächste: {fmt(chore.nextDue)}</span>}
                        {chore.note && <span style={{ fontSize: "0.64rem", color: "hsl(0 0% 28%)", fontStyle: "italic" }}>{chore.note}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button className="btn-cyan" style={{ padding: "3px 8px", fontSize: "0.62rem" }} onClick={() => startEdit(chore)}>✎</button>
                      <button className="btn-danger" style={{ padding: "3px 7px", fontSize: "0.62rem" }} onClick={() => deleteMut.mutate(chore.id)}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
