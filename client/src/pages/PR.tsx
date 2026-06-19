import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TrainingPR } from "@shared/schema";

const CATEGORIES = [
  { id: "upper", label: "Oberkörper", emoji: "💪" },
  { id: "lower", label: "Unterkörper", emoji: "🦵" },
  { id: "core",  label: "Core",        emoji: "🔥" },
  { id: "full",  label: "Ganzkörper",  emoji: "⚡" },
];

const UNITS = [
  { id: "kg",   label: "kg" },
  { id: "reps", label: "Wiederholungen" },
  { id: "sek",  label: "Sekunden" },
];

// Default exercises per category
const PRESETS: Record<string, string[]> = {
  upper: ["Klimmzüge", "Dips", "Push-Ups", "Pike Push-Ups", "Handstand Push-Ups", "Rows", "Chin-Ups", "Muscle-Up"],
  lower: ["Kniebeugen", "Pistol Squat", "Bulgarian Split Squat", "Lunges", "Calf Raises"],
  core:  ["L-Sit", "Plank", "Dragon Flag", "Hollow Body Hold", "Ab Wheel"],
  full:  ["Burpees", "Thrusters", "Clean & Press", "Turkish Get-Up"],
};

function PRCard({ pr, onDelete, onEdit }: { pr: TrainingPR; onDelete: () => void; onEdit: () => void }) {
  const cat = CATEGORIES.find(c => c.id === pr.category);
  const unitLabel = pr.unit === "kg" ? "kg" : pr.unit === "reps" ? "Wdh" : "s";

  return (
    <div className="wd-card-fancy" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
      {/* Category emoji */}
      <div style={{
        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
        background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem"
      }}>
        {cat?.emoji ?? "🏆"}
      </div>

      {/* Name + date */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "hsl(0 0% 90%)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {pr.exercise}
        </div>
        <div style={{ fontSize: "0.72rem", color: "hsl(0 0% 40%)" }}>
          {cat?.label} · {pr.date}
          {pr.note && <span style={{ marginLeft: 6, color: "hsl(0 0% 35%)" }}>— {pr.note}</span>}
        </div>
      </div>

      {/* Value */}
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "#4ade80", letterSpacing: "-0.02em" }}>
          {pr.value}
        </span>
        <span style={{ fontSize: "0.72rem", color: "hsl(0 0% 45%)", marginLeft: 3 }}>{unitLabel}</span>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button onClick={onEdit} style={{ width: 28, height: 28, borderRadius: 7, background: "hsl(0 0% 12%)", border: "1px solid hsl(0 0% 18%)", color: "hsl(0 0% 55%)", cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
          ✏️
        </button>
        <button onClick={onDelete} style={{ width: 28, height: 28, borderRadius: 7, background: "hsl(0 0% 12%)", border: "1px solid hsl(0 0% 18%)", color: "#f87171", cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
          ✕
        </button>
      </div>
    </div>
  );
}

export default function PRPage() {
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);

  const { data: prs = [] } = useQuery<TrainingPR[]>({ queryKey: ["/api/prs"] });

  const [filterCat, setFilterCat] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [exercise, setExercise] = useState("");
  const [category, setCategory] = useState("upper");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("kg");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today);

  const resetForm = () => {
    setEditId(null); setExercise(""); setCategory("upper");
    setValue(""); setUnit("kg"); setNote(""); setDate(today);
    setShowForm(false);
  };

  const addMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/prs", d).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/prs"] }); resetForm(); toast({ title: "PR eingetragen 🏆" }); }
  });
  const updateMut = useMutation({
    mutationFn: ({ id, ...d }: any) => apiRequest("PATCH", `/api/prs/${id}`, d).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/prs"] }); resetForm(); toast({ title: "PR aktualisiert" }); }
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/prs/${id}`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/prs"] })
  });

  const handleSubmit = () => {
    if (!exercise.trim() || !value) return;
    const payload = { exercise: exercise.trim(), category, value: parseFloat(value), unit, note: note.trim() || null, date };
    if (editId) updateMut.mutate({ id: editId, ...payload });
    else addMut.mutate(payload);
  };

  const handleEdit = (pr: TrainingPR) => {
    setEditId(pr.id); setExercise(pr.exercise); setCategory(pr.category);
    setValue(String(pr.value)); setUnit(pr.unit); setNote(pr.note ?? ""); setDate(pr.date);
    setShowForm(true);
  };

  // Best PRs per exercise (highest value)
  const bestPRs = prs.reduce<Record<string, TrainingPR>>((acc, pr) => {
    if (!acc[pr.exercise] || pr.value > acc[pr.exercise].value) acc[pr.exercise] = pr;
    return acc;
  }, {});

  const filtered = Object.values(bestPRs).filter(pr => {
    if (filterCat !== "all" && pr.category !== filterCat) return false;
    if (search && !pr.exercise.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => a.exercise.localeCompare(b.exercise));

  // Stats
  const totalExercises = Object.keys(bestPRs).length;
  const recentPR = [...prs].sort((a, b) => b.date.localeCompare(a.date))[0];

  const inputStyle = {
    width: "100%", padding: "8px 12px", borderRadius: 9,
    background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 16%)",
    color: "hsl(0 0% 88%)", fontSize: "0.85rem", outline: "none"
  } as React.CSSProperties;

  return (
    <div style={{ padding: "28px 28px 80px", maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 600, color: "hsl(0 0% 92%)", letterSpacing: "-0.02em", marginBottom: 2 }}>
            Trainings-PRs
          </h1>
          <p style={{ fontSize: "0.78rem", color: "hsl(0 0% 40%)" }}>
            {totalExercises} Übungen · {prs.length} Einträge gesamt
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          style={{ padding: "8px 16px", borderRadius: 10, background: "#4ade80", color: "#0a0a0a", fontWeight: 700, fontSize: "0.83rem", border: "none", cursor: "pointer" }}
        >
          + Neuer PR
        </button>
      </div>

      {/* Stats row */}
      {recentPR && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
          {[
            { label: "Übungen", val: String(totalExercises) },
            { label: "Letzter PR", val: recentPR.exercise },
            { label: "Datum", val: recentPR.date },
          ].map(s => (
            <div key={s.label} className="wd-card" style={{ padding: "14px 16px" }}>
              <div style={{ fontSize: "0.68rem", color: "hsl(0 0% 38%)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: "0.92rem", fontWeight: 600, color: "hsl(0 0% 85%)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="wd-card-fancy" style={{ padding: 28, width: "100%", maxWidth: 420 }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "hsl(0 0% 90%)", marginBottom: 20 }}>
              {editId ? "PR bearbeiten" : "Neuen PR eintragen"}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Exercise + presets */}
              <div>
                <label style={{ fontSize: "0.72rem", color: "hsl(0 0% 45%)", display: "block", marginBottom: 4 }}>Übung</label>
                <input value={exercise} onChange={e => setExercise(e.target.value)} placeholder="z.B. Klimmzüge" style={inputStyle} />
                {/* Quick preset chips */}
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                  {(PRESETS[category] ?? []).slice(0, 5).map(p => (
                    <button key={p} onClick={() => setExercise(p)} style={{ fontSize: "0.68rem", padding: "3px 8px", borderRadius: 6, background: exercise === p ? "rgba(74,222,128,0.18)" : "hsl(0 0% 10%)", border: `1px solid ${exercise === p ? "rgba(74,222,128,0.35)" : "hsl(0 0% 16%)"}`, color: exercise === p ? "#4ade80" : "hsl(0 0% 50%)", cursor: "pointer" }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label style={{ fontSize: "0.72rem", color: "hsl(0 0% 45%)", display: "block", marginBottom: 4 }}>Kategorie</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {CATEGORIES.map(c => (
                    <button key={c.id} onClick={() => setCategory(c.id)} style={{ flex: 1, padding: "7px 4px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 500, border: `1px solid ${category === c.id ? "rgba(74,222,128,0.35)" : "hsl(0 0% 16%)"}`, background: category === c.id ? "rgba(74,222,128,0.1)" : "hsl(0 0% 8%)", color: category === c.id ? "#4ade80" : "hsl(0 0% 50%)", cursor: "pointer" }}>
                      {c.emoji}<br /><span style={{ fontSize: "0.65rem" }}>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Value + Unit */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: "0.72rem", color: "hsl(0 0% 45%)", display: "block", marginBottom: 4 }}>Wert</label>
                  <input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="z.B. 80" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: "0.72rem", color: "hsl(0 0% 45%)", display: "block", marginBottom: 4 }}>Einheit</label>
                  <select value={unit} onChange={e => setUnit(e.target.value)} style={inputStyle}>
                    {UNITS.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Date */}
              <div>
                <label style={{ fontSize: "0.72rem", color: "hsl(0 0% 45%)", display: "block", marginBottom: 4 }}>Datum</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
              </div>

              {/* Note */}
              <div>
                <label style={{ fontSize: "0.72rem", color: "hsl(0 0% 45%)", display: "block", marginBottom: 4 }}>Notiz (optional)</label>
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="z.B. sauber, kein Schwung" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button onClick={resetForm} style={{ flex: 1, padding: "9px 0", borderRadius: 9, background: "hsl(0 0% 10%)", border: "1px solid hsl(0 0% 18%)", color: "hsl(0 0% 55%)", fontSize: "0.83rem", cursor: "pointer" }}>
                Abbrechen
              </button>
              <button onClick={handleSubmit} style={{ flex: 2, padding: "9px 0", borderRadius: 9, background: "#4ade80", color: "#0a0a0a", fontWeight: 700, fontSize: "0.83rem", border: "none", cursor: "pointer" }}>
                {editId ? "Speichern" : "PR eintragen 🏆"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Übung suchen…" style={{ ...inputStyle, width: "auto", flex: 1, minWidth: 140 }} />
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setFilterCat("all")} style={{ padding: "6px 12px", borderRadius: 8, fontSize: "0.75rem", border: `1px solid ${filterCat === "all" ? "rgba(74,222,128,0.35)" : "hsl(0 0% 16%)"}`, background: filterCat === "all" ? "rgba(74,222,128,0.1)" : "hsl(0 0% 8%)", color: filterCat === "all" ? "#4ade80" : "hsl(0 0% 50%)", cursor: "pointer" }}>
            Alle
          </button>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setFilterCat(c.id)} style={{ padding: "6px 10px", borderRadius: 8, fontSize: "0.75rem", border: `1px solid ${filterCat === c.id ? "rgba(74,222,128,0.35)" : "hsl(0 0% 16%)"}`, background: filterCat === c.id ? "rgba(74,222,128,0.1)" : "hsl(0 0% 8%)", color: filterCat === c.id ? "#4ade80" : "hsl(0 0% 50%)", cursor: "pointer" }}>
              {c.emoji}
            </button>
          ))}
        </div>
      </div>

      {/* PR List — grouped by category */}
      {CATEGORIES.filter(c => filterCat === "all" || filterCat === c.id).map(cat => {
        const items = filtered.filter(pr => pr.category === cat.id);
        if (items.length === 0) return null;
        return (
          <div key={cat.id} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "hsl(0 0% 38%)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
              {cat.emoji} {cat.label}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map(pr => (
                <PRCard key={pr.id} pr={pr} onDelete={() => deleteMut.mutate(pr.id)} onEdit={() => handleEdit(pr)} />
              ))}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "hsl(0 0% 35%)" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12 }}>🏆</div>
          <p style={{ fontSize: "0.85rem" }}>Noch keine PRs eingetragen</p>
          <p style={{ fontSize: "0.75rem", marginTop: 4 }}>Klick auf „+ Neuer PR" um zu starten</p>
        </div>
      )}
    </div>
  );
}
