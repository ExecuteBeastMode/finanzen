import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DateIdea } from "@shared/schema";

const CATEGORIES = ["activity", "restaurant", "trip", "home", "surprise", "sport", "natur"];
const CAT_LABELS: Record<string, string> = { activity: "Aktivität", restaurant: "Restaurant", trip: "Ausflug", home: "Zuhause", surprise: "Überraschung", sport: "Sport", natur: "Natur" };
const CAT_COLORS: Record<string, string> = { activity: "#00d4ff", restaurant: "#f97316", trip: "#06b6d4", home: "#8b5cf6", surprise: "#f472b6", sport: "#10b981", natur: "#22c55e" };
const SEASONS = ["all", "spring", "summer", "autumn", "winter"];
const SEASON_LABELS: Record<string, string> = { all: "Jede Saison", spring: "Frühling", summer: "Sommer", autumn: "Herbst", winter: "Winter" };
const SEASON_ICONS: Record<string, string> = { all: "🌟", spring: "🌸", summer: "☀️", autumn: "🍂", winter: "❄️" };

// Budget presets for quick selection
const BUDGET_PRESETS = [
  { label: "Kostenlos", value: 0 },
  { label: "bis €10", value: 10 },
  { label: "bis €25", value: 25 },
  { label: "bis €50", value: 50 },
  { label: "bis €100", value: 100 },
];

export default function DateIdeasPage() {
  const { toast } = useToast();
  const { data: ideas = [] } = useQuery<DateIdea[]>({ queryKey: ["/api/date-ideas"] });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const [randomIdea, setRandomIdea] = useState<DateIdea | null>(null);
  const [showRandomizer, setShowRandomizer] = useState(false);
  const [randBudget, setRandBudget] = useState<string>("");
  const [randBudgetPreset, setRandBudgetPreset] = useState<number | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", category: "activity", season: "all",
    estimatedCost: "" as string | number
  });

  const addMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/date-ideas", data).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/date-ideas"] }); setShowForm(false); resetForm(); toast({ title: "Idee hinzugefügt 💕" }); }
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PATCH", `/api/date-ideas/${id}`, data).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/date-ideas"] }); setEditingId(null); setShowForm(false); resetForm(); }
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/date-ideas/${id}`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/date-ideas"] })
  });
  const doneMut = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) => apiRequest("PATCH", `/api/date-ideas/${id}`, { done, doneDate: done ? new Date().toISOString().slice(0, 10) : null }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/date-ideas"] })
  });
  const rateMut = useMutation({
    mutationFn: ({ id, rating }: { id: number; rating: number }) => apiRequest("PATCH", `/api/date-ideas/${id}`, { rating }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/date-ideas"] })
  });

  const resetForm = () => setForm({ title: "", description: "", category: "activity", season: "all", estimatedCost: "" });

  const filtered = ideas.filter(i => {
    if (filter === "open") return !i.done;
    if (filter === "done") return i.done;
    return true;
  });

  const openCount = ideas.filter(i => !i.done).length;
  const doneCount = ideas.filter(i => i.done).length;

  // Classic random (no budget filter)
  const getRandom = () => {
    const open = ideas.filter(i => !i.done);
    if (open.length === 0) { toast({ title: "Keine offenen Ideen mehr!", description: "Füge neue Ideen hinzu" }); return; }
    setRandomIdea(open[Math.floor(Math.random() * open.length)]);
  };

  // Budget randomizer
  const runBudgetRandomizer = () => {
    const maxBudget = randBudgetPreset !== null ? randBudgetPreset : parseFloat(randBudget);
    const isZero = maxBudget === 0;

    const candidates = ideas.filter(i => {
      if (i.done) return false;
      const cost = (i as any).estimatedCost ?? 0;
      if (isZero) return cost === 0;
      return cost <= maxBudget;
    });

    if (candidates.length === 0) {
      toast({
        title: "Keine passenden Ideen",
        description: isZero
          ? "Keine kostenlosen Ideen gefunden. Trage bei deinen Ideen einen Preis von €0 ein!"
          : `Keine Ideen mit max. €${maxBudget} gefunden.`,
      });
      return;
    }
    setRandomIdea(candidates[Math.floor(Math.random() * candidates.length)]);
    setShowRandomizer(false);
  };

  const startEdit = (idea: DateIdea) => {
    setForm({
      title: idea.title,
      description: idea.description || "",
      category: idea.category,
      season: idea.season,
      estimatedCost: (idea as any).estimatedCost ?? ""
    });
    setEditingId(idea.id);
    setShowForm(true);
  };

  const fmtCost = (cost: number) => cost === 0 ? "Kostenlos" : `€${cost.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 className="section-title" style={{ fontSize: "1.1rem", color: "#f472b6" }}>Date Ideen 💕</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-cyan" style={{ background: "rgba(244,114,182,0.12)", color: "#f472b6", borderColor: "rgba(244,114,182,0.35)" }} onClick={() => setShowRandomizer(true)}>🎲 Budget-Randomizer</button>
          <button className="btn-cyan" onClick={() => { setShowForm(true); setEditingId(null); resetForm(); }}>+ Neue Idee</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        <div className="wd-card" style={{ padding: 14 }}>
          <div style={{ fontSize: "0.65rem", color: "hsl(0 0% 35%)", marginBottom: 3, letterSpacing: "0.08em", textTransform: "uppercase" }}>Gesamt</div>
          <div className="mono" style={{ fontSize: "1.3rem", fontWeight: 700, color: "#f472b6" }}>{ideas.length}</div>
        </div>
        <div className="wd-card" style={{ padding: 14 }}>
          <div style={{ fontSize: "0.65rem", color: "hsl(0 0% 35%)", marginBottom: 3, letterSpacing: "0.08em", textTransform: "uppercase" }}>Noch offen</div>
          <div className="mono" style={{ fontSize: "1.3rem", fontWeight: 700, color: "#4ade80" }}>{openCount}</div>
        </div>
        <div className="wd-card" style={{ padding: 14 }}>
          <div style={{ fontSize: "0.65rem", color: "hsl(0 0% 35%)", marginBottom: 3, letterSpacing: "0.08em", textTransform: "uppercase" }}>Gemacht</div>
          <div className="mono" style={{ fontSize: "1.3rem", fontWeight: 700, color: "hsl(0 0% 55%)" }}>{doneCount}</div>
        </div>
      </div>

      {/* Budget Randomizer Modal */}
      {showRandomizer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setShowRandomizer(false)}>
          <div className="wd-card" style={{ padding: 28, maxWidth: 400, width: "90%", borderColor: "rgba(244,114,182,0.4)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "1.5rem", marginBottom: 10 }}>🎲</div>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "hsl(0 0% 88%)", marginBottom: 6 }}>Budget-Randomizer</div>
            <div style={{ fontSize: "0.75rem", color: "hsl(0 0% 42%)", marginBottom: 18, lineHeight: 1.5 }}>
              Wähle ein maximales Budget — ich schlage dir eine passende Unternehmung vor.
            </div>

            {/* Presets */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: "0.62rem", color: "hsl(0 0% 35%)", marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" }}>Schnellauswahl</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {BUDGET_PRESETS.map(p => (
                  <button key={p.value} onClick={() => { setRandBudgetPreset(p.value); setRandBudget(""); }} style={{
                    padding: "5px 12px", fontSize: "0.72rem", fontFamily: "inherit", cursor: "pointer",
                    border: "1px solid", borderRadius: 5,
                    borderColor: randBudgetPreset === p.value ? "rgba(244,114,182,0.5)" : "hsl(0 0% 18%)",
                    background: randBudgetPreset === p.value ? "rgba(244,114,182,0.12)" : "hsl(0 0% 8%)",
                    color: randBudgetPreset === p.value ? "#f472b6" : "hsl(0 0% 55%)",
                  }}>{p.label}</button>
                ))}
              </div>
            </div>

            {/* Custom input */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: "0.62rem", color: "hsl(0 0% 35%)", marginBottom: 6, letterSpacing: "0.08em", textTransform: "uppercase" }}>Oder eigenen Betrag eingeben (€)</div>
              <input
                type="number"
                min="0"
                step="1"
                value={randBudget}
                onChange={e => { setRandBudget(e.target.value); setRandBudgetPreset(null); }}
                placeholder="z.B. 30"
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-danger" onClick={() => setShowRandomizer(false)} style={{ flex: 1 }}>Abbrechen</button>
              <button
                className="btn-cyan"
                style={{ flex: 1, background: "rgba(244,114,182,0.12)", color: "#f472b6", borderColor: "rgba(244,114,182,0.35)" }}
                onClick={runBudgetRandomizer}
                disabled={randBudgetPreset === null && randBudget === ""}
              >
                🎲 Würfeln
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Random result modal */}
      {randomIdea && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setRandomIdea(null)}>
          <div className="wd-card" style={{ padding: 28, maxWidth: 420, width: "90%", borderColor: "rgba(244,114,182,0.5)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>💕</div>
            <div style={{ fontSize: "0.65rem", color: "#f472b6", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Date Vorschlag</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "hsl(0 0% 92%)", marginBottom: 10 }}>{randomIdea.title}</div>
            {randomIdea.description && <div style={{ fontSize: "0.85rem", color: "hsl(0 0% 45%)", marginBottom: 12, lineHeight: 1.5 }}>{randomIdea.description}</div>}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: 4, background: (CAT_COLORS[randomIdea.category] || "#4ade80") + "20", color: CAT_COLORS[randomIdea.category] || "#4ade80", border: `1px solid ${CAT_COLORS[randomIdea.category] || "#4ade80"}40` }}>
                {CAT_LABELS[randomIdea.category]}
              </span>
              <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: 4, background: "rgba(244,114,182,0.1)", color: "#f472b6", border: "1px solid rgba(244,114,182,0.3)" }}>
                {SEASON_ICONS[randomIdea.season]} {SEASON_LABELS[randomIdea.season]}
              </span>
              {((randomIdea as any).estimatedCost !== undefined) && (
                <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: 4, background: "rgba(74,222,128,0.08)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" }}>
                  {fmtCost((randomIdea as any).estimatedCost)}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-cyan" style={{ background: "rgba(74,222,128,0.12)", color: "#4ade80", borderColor: "rgba(74,222,128,0.35)" }} onClick={() => { doneMut.mutate({ id: randomIdea.id, done: true }); setRandomIdea(null); }}>✓ Gemacht!</button>
              <button className="btn-cyan" onClick={getRandom}>🎲 Anderes</button>
              <button className="btn-danger" onClick={() => setRandomIdea(null)}>Schließen</button>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="wd-card" style={{ padding: 20, marginBottom: 20, borderColor: "rgba(244,114,182,0.25)" }}>
          <div className="section-title" style={{ marginBottom: 14 }}>{editingId ? "Idee bearbeiten" : "Neue Date Idee"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: "0.65rem", color: "hsl(0 0% 35%)", display: "block", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Titel *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Minigolf spielen" />
              </div>
              <div>
                <label style={{ fontSize: "0.65rem", color: "hsl(0 0% 35%)", display: "block", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Kategorie</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: "0.65rem", color: "hsl(0 0% 35%)", display: "block", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Beschreibung</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details zur Idee..." rows={2} style={{ resize: "vertical" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: "0.65rem", color: "hsl(0 0% 35%)", display: "block", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Geschätzte Kosten (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.estimatedCost}
                  onChange={e => setForm(f => ({ ...f, estimatedCost: e.target.value }))}
                  placeholder="0 = kostenlos"
                />
              </div>
              <div>
                <label style={{ fontSize: "0.65rem", color: "hsl(0 0% 35%)", display: "block", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Saison</label>
                <select value={form.season} onChange={e => setForm(f => ({ ...f, season: e.target.value }))}>
                  {SEASONS.map(s => <option key={s} value={s}>{SEASON_ICONS[s]} {SEASON_LABELS[s]}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn-danger" onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }}>Abbrechen</button>
              <button className="btn-cyan" onClick={() => {
                if (!form.title) return;
                const cost = form.estimatedCost === "" ? 0 : parseFloat(form.estimatedCost as string);
                const data = { ...form, estimatedCost: isNaN(cost) ? 0 : cost };
                if (editingId) { updateMut.mutate({ id: editingId, data }); } else { addMut.mutate(data); }
              }}>{editingId ? "Speichern" : "Hinzufügen"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(["all", "open", "done"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "4px 14px", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "inherit", cursor: "pointer", border: "1px solid", borderColor: filter === f ? "rgba(244,114,182,0.4)" : "hsl(0 0% 15%)", background: filter === f ? "rgba(244,114,182,0.1)" : "transparent", color: filter === f ? "#f472b6" : "hsl(0 0% 45%)", borderRadius: 4 }}>
            {f === "all" ? "Alle" : f === "open" ? "Offen" : "Gemacht"}
          </button>
        ))}
      </div>

      {/* Ideas grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
        {filtered.map(idea => {
          const catColor = CAT_COLORS[idea.category] || "#4ade80";
          const cost = (idea as any).estimatedCost ?? 0;
          return (
            <div key={idea.id} className="wd-card" style={{ padding: "14px 16px", opacity: idea.done ? 0.6 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, marginBottom: 4, textDecoration: idea.done ? "line-through" : "none", color: "hsl(0 0% 88%)" }}>{idea.title}</div>
                  {idea.description && <div style={{ fontSize: "0.74rem", color: "hsl(0 0% 42%)", marginBottom: 6, lineHeight: 1.4 }}>{idea.description}</div>}
                </div>
                <input type="checkbox" checked={idea.done} onChange={e => doneMut.mutate({ id: idea.id, done: e.target.checked })} style={{ marginLeft: 8, marginTop: 2 }} />
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={{ fontSize: "0.62rem", padding: "1px 7px", borderRadius: 3, background: catColor + "20", color: catColor, border: `1px solid ${catColor}40` }}>{CAT_LABELS[idea.category]}</span>
                <span style={{ fontSize: "0.62rem", padding: "1px 7px", borderRadius: 3, background: "rgba(244,114,182,0.08)", color: "#f472b6", border: "1px solid rgba(244,114,182,0.25)" }}>{SEASON_ICONS[idea.season]} {SEASON_LABELS[idea.season]}</span>
                <span style={{ fontSize: "0.62rem", padding: "1px 7px", borderRadius: 3, background: "rgba(74,222,128,0.08)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.2)" }}>{fmtCost(cost)}</span>
              </div>
              {idea.done && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 3 }}>
                    {[1,2,3,4,5].map(star => (
                      <button key={star} onClick={() => rateMut.mutate({ id: idea.id, rating: star })} style={{ fontSize: "0.9rem", background: "none", border: "none", cursor: "pointer", color: (idea.rating || 0) >= star ? "#f59e0b" : "hsl(0 0% 22%)", transition: "color 0.1s" }}>★</button>
                    ))}
                  </div>
                  {idea.doneDate && <div style={{ fontSize: "0.62rem", color: "hsl(0 0% 32%)", marginTop: 2 }}>✓ {new Date(idea.doneDate).toLocaleDateString("de-DE")}</div>}
                </div>
              )}
              <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }}>
                <button className="btn-cyan" style={{ padding: "3px 8px", fontSize: "0.65rem" }} onClick={() => startEdit(idea)}>✎</button>
                <button className="btn-danger" style={{ padding: "3px 8px", fontSize: "0.65rem" }} onClick={() => deleteMut.mutate(idea.id)}>✕</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="wd-card" style={{ padding: 24, textAlign: "center", gridColumn: "1/-1" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>💕</div>
            <div style={{ color: "hsl(0 0% 35%)", fontSize: "0.85rem" }}>Noch keine Ideen — füge eure erste Date Idee hinzu!</div>
          </div>
        )}
      </div>
    </div>
  );
}
