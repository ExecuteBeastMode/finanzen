import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SavingsEntry, MonthlyFixedCost, MonthlyFixedCostCheck, AnnualFixedCost, AnnualFixedCostCheck, Category, Expense } from "@shared/schema";

const MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
const EXPENSE_CATS = ["einkauf","essen","transport","kleidung","freizeit","gesundheit","sonstiges"];
const EXPENSE_CAT_LABELS: Record<string,string> = { einkauf:"Einkauf", essen:"Essen & Trinken", transport:"Transport", kleidung:"Kleidung", freizeit:"Freizeit", gesundheit:"Gesundheit", sonstiges:"Sonstiges" };

function SavingsChart({ entries }: { entries: SavingsEntry[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current || entries.length < 2) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    const points = sorted.map(e => { running += e.amount; return { date: e.date, value: running }; });
    const min = Math.min(0, ...points.map(p => p.value));
    const max = Math.max(...points.map(p => p.value), 1);
    const pad = 32;
    const x = (i: number) => pad + (i / Math.max(points.length - 1, 1)) * (W - pad * 2);
    const y = (v: number) => H - pad - ((v - min) / (max - min)) * (H - pad * 2);
    ctx.strokeStyle = "hsl(0 0% 13%)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const yy = pad + (i / 4) * (H - pad * 2);
      ctx.beginPath(); ctx.moveTo(pad, yy); ctx.lineTo(W - pad, yy); ctx.stroke();
    }
    const grad = ctx.createLinearGradient(0, pad, 0, H - pad);
    grad.addColorStop(0, "rgba(74,222,128,0.18)");
    grad.addColorStop(1, "rgba(74,222,128,0.01)");
    ctx.beginPath();
    ctx.moveTo(x(0), y(points[0].value));
    points.forEach((p, i) => { if (i > 0) ctx.lineTo(x(i), y(p.value)); });
    ctx.lineTo(x(points.length - 1), H - pad);
    ctx.lineTo(x(0), H - pad);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.beginPath();
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 2;
    ctx.moveTo(x(0), y(points[0].value));
    points.forEach((p, i) => { if (i > 0) ctx.lineTo(x(i), y(p.value)); });
    ctx.stroke();
    points.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(x(i), y(p.value), 3, 0, Math.PI * 2);
      ctx.fillStyle = "#4ade80";
      ctx.fill();
    });
    ctx.fillStyle = "hsl(0 0% 35%)";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    if (points.length <= 12) {
      points.forEach((p, i) => {
        const d = new Date(p.date);
        ctx.fillText(`${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`, x(i), H - 8);
      });
    }
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const v = min + (i / 4) * (max - min);
      ctx.fillText(`€${v.toFixed(0)}`, pad - 4, H - pad - (i / 4) * (H - pad * 2) + 4);
    }
  }, [entries]);
  if (entries.length < 2) return <div style={{ height: 150, display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(0 0% 30%)", fontSize: "0.78rem" }}>Mindestens 2 Einträge für den Graphen</div>;
  return <canvas ref={canvasRef} width={500} height={150} style={{ width: "100%", height: 150 }} />;
}

function Tab({ id, label, active, onClick }: { id: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 14px", fontSize: "0.78rem", fontWeight: 500, fontFamily: "inherit", cursor: "pointer",
      border: "1px solid", borderColor: active ? "hsl(0 0% 22%)" : "transparent",
      background: active ? "hsl(0 0% 11%)" : "transparent",
      color: active ? "hsl(0 0% 85%)" : "hsl(0 0% 40%)",
      borderRadius: 6, transition: "all 0.12s",
    }}>{label}</button>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: "0.65rem", color: "hsl(0 0% 35%)", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>{children}</div>;
}

export default function FinancePage() {
  const { toast } = useToast();
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.toISOString().slice(0, 7));
  const selectedYear = parseInt(selectedMonth.slice(0, 4));
  const selectedMonthIdx = parseInt(selectedMonth.slice(5, 7)) - 1;
  const [activeTab, setActiveTab] = useState<"ausgaben" | "sparkonto" | "monatlich" | "jaehrlich" | "kategorien">("ausgaben");

  // ── PIN Lock ──────────────────────────────────────────────────────────────
  const PIN = "3699";
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  // Reset lock whenever the page mounts (i.e. user navigates to this route)
  useEffect(() => {
    setUnlocked(false);
    setPinInput("");
    setPinError(false);
  }, []);
  const handlePinSubmit = () => {
    if (pinInput === PIN) {
      setUnlocked(true);
      setPinError(false);
      // Notify Dashboard that finances are unlocked for this session
      try { sessionStorage.setItem("lifeos_finance_unlocked", "1"); } catch {}
      window.dispatchEvent(new Event("lifeos_finance_unlocked"));
    } else {
      setPinError(true);
      setPinInput("");
    }
  };
  const fmt = (n: number) => n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Savings ──────────────────────────────────────────────────────────────
  const { data: savings = [] } = useQuery<SavingsEntry[]>({ queryKey: ["/api/savings"] });
  const [savingsNote, setSavingsNote] = useState("");
  const [savingsAmount, setSavingsAmount] = useState("");
  const [savingsDate, setSavingsDate] = useState(today.toISOString().slice(0, 10));
  const [savingsType, setSavingsType] = useState<"einzahlung" | "abhebung">("einzahlung");
  const addSavingsMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/savings", d).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/savings"] }); setSavingsAmount(""); setSavingsNote(""); toast({ title: "Eintrag hinzugefügt" }); }
  });
  const delSavingsMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/savings/${id}`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/savings"] })
  });
  const savingsTotal = savings.reduce((s, e) => s + e.amount, 0);

  // ── Budget ────────────────────────────────────────────────────────────────
  const { data: budget } = useQuery<any>({ queryKey: ["/api/budget", selectedMonth], queryFn: () => apiRequest("GET", `/api/budget/${selectedMonth}`).then(r => r.json()) });
  const [income, setIncome] = useState("");
  useEffect(() => { if (budget) setIncome(budget.income?.toString() || ""); }, [budget]);
  const saveBudgetMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/budget", d).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/budget", selectedMonth] }); toast({ title: "Budget gespeichert" }); }
  });

  // ── Monthly costs ─────────────────────────────────────────────────────────
  const { data: monthlyCosts = [] } = useQuery<MonthlyFixedCost[]>({ queryKey: ["/api/monthly-costs"] });
  const { data: monthlyChecks = [] } = useQuery<MonthlyFixedCostCheck[]>({ queryKey: ["/api/monthly-costs/checks", selectedMonth], queryFn: () => apiRequest("GET", `/api/monthly-costs/checks/${selectedMonth}`).then(r => r.json()) });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const [newCostName, setNewCostName] = useState("");
  const [newCostAmount, setNewCostAmount] = useState("");
  const [newCostCat, setNewCostCat] = useState("");
  const addMonthlyCostMut = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/monthly-costs", d).then(r => r.json()), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/monthly-costs"] }); setNewCostName(""); setNewCostAmount(""); } });
  const delMonthlyCostMut = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/monthly-costs/${id}`).then(r => r.json()), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/monthly-costs"] }) });
  const toggleMonthlyMut = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/monthly-costs/checks/toggle", d).then(r => r.json()), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/monthly-costs/checks", selectedMonth] }) });
  const activeMonthlyCosts = monthlyCosts.filter(c => c.isActive);
  const checkedMonthlyIds = new Set(monthlyChecks.filter(c => c.checked).map(c => c.costId));
  const totalMonthly = activeMonthlyCosts.reduce((s, c) => s + c.amount, 0);
  const paidMonthly = activeMonthlyCosts.filter(c => checkedMonthlyIds.has(c.id)).reduce((s, c) => s + c.amount, 0);

  // ── Annual costs ──────────────────────────────────────────────────────────
  const { data: annualCosts = [] } = useQuery<AnnualFixedCost[]>({ queryKey: ["/api/annual-costs"] });
  const { data: annualChecks = [] } = useQuery<AnnualFixedCostCheck[]>({ queryKey: ["/api/annual-costs/checks", selectedYear], queryFn: () => apiRequest("GET", `/api/annual-costs/checks/${selectedYear}`).then(r => r.json()) });
  const [newAnnualName, setNewAnnualName] = useState("");
  const [newAnnualAmount, setNewAnnualAmount] = useState("");
  const [newAnnualMonth, setNewAnnualMonth] = useState(String(selectedMonthIdx + 1));
  const addAnnualCostMut = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/annual-costs", d).then(r => r.json()), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/annual-costs"] }); setNewAnnualName(""); setNewAnnualAmount(""); } });
  const delAnnualCostMut = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/annual-costs/${id}`).then(r => r.json()), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/annual-costs"] }) });
  const toggleAnnualMut = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/annual-costs/checks/toggle", d).then(r => r.json()), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/annual-costs/checks", selectedYear] }) });
  const checkedAnnualIds = new Set(annualChecks.filter(c => c.checked).map(c => c.costId));
  const annualThisMonth = annualCosts.filter(c => c.isActive && c.dueMonth === selectedMonthIdx + 1);
  const totalAnnualYear = annualCosts.filter(c => c.isActive).reduce((s, c) => s + c.amount, 0);
  const paidAnnualYear = annualCosts.filter(c => c.isActive && checkedAnnualIds.has(c.id)).reduce((s, c) => s + c.amount, 0);

  // ── Variable Expenses ─────────────────────────────────────────────────────
  const { data: expenses = [] } = useQuery<Expense[]>({ queryKey: ["/api/expenses", selectedMonth], queryFn: () => apiRequest("GET", `/api/expenses/${selectedMonth}`).then(r => r.json()) });
  const [expName, setExpName] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expCat, setExpCat] = useState("einkauf");
  const [expDate, setExpDate] = useState(today.toISOString().slice(0, 10));
  const [expNote, setExpNote] = useState("");
  const addExpMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/expenses", d).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/expenses", selectedMonth] }); setExpName(""); setExpAmount(""); setExpNote(""); toast({ title: "Ausgabe eingetragen" }); }
  });
  const delExpMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/expenses/${id}`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/expenses", selectedMonth] })
  });
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const incomeNum = parseFloat(income) || 0;
  const freeBudget = incomeNum - totalMonthly - totalExpenses;

  // ── Categories ────────────────────────────────────────────────────────────
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#4ade80");
  const addCatMut = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/categories", d).then(r => r.json()), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/categories"] }); setNewCatName(""); } });
  const delCatMut = useMutation({ mutationFn: (id: number) => apiRequest("DELETE", `/api/categories/${id}`).then(r => r.json()), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/categories"] }) });

  if (!unlocked) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div className="wd-card-fancy" style={{ padding: "40px 32px", width: 300, textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.22)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <p style={{ fontSize: "1.05rem", fontWeight: 600, color: "hsl(0 0% 90%)", marginBottom: 6 }}>Finanzen</p>
          <p style={{ fontSize: "0.78rem", color: "hsl(0 0% 45%)", marginBottom: 24 }}>PIN eingeben um fortzufahren</p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinInput}
            onChange={e => { setPinInput(e.target.value.replace(/\D/g, "")); setPinError(false); }}
            onKeyDown={e => e.key === "Enter" && handlePinSubmit()}
            placeholder="• • • •"
            autoFocus
            style={{
              width: "100%", textAlign: "center", fontSize: "1.4rem", letterSpacing: "0.4em",
              padding: "10px 0", background: "hsl(0 0% 8%)", border: `1px solid ${pinError ? "#f87171" : "hsl(0 0% 16%)"}`,
              borderRadius: 10, color: "hsl(0 0% 92%)", outline: "none", marginBottom: 8,
              transition: "border-color 0.2s"
            }}
          />
          {pinError && <p style={{ fontSize: "0.75rem", color: "#f87171", marginBottom: 8 }}>Falscher PIN</p>}
          <button
            onClick={handlePinSubmit}
            style={{ width: "100%", padding: "10px 0", borderRadius: 10, background: "#4ade80", color: "#0a0a0a", fontWeight: 700, fontSize: "0.88rem", border: "none", cursor: "pointer", marginTop: 4 }}
          >
            Entsperren
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 28px 32px", maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: "1.35rem", fontWeight: 600, color: "hsl(0 0% 92%)", letterSpacing: "-0.02em" }}>Finanzen</h1>
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} style={{ width: "auto", padding: "5px 10px", fontSize: "0.8rem" }}>
          {Array.from({ length: 24 }, (_, i) => {
            const d = new Date(today.getFullYear(), today.getMonth() - 12 + i, 1);
            const val = d.toISOString().slice(0, 7);
            return <option key={val} value={val}>{MONTHS[d.getMonth()]} {d.getFullYear()}</option>;
          })}
        </select>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, flexWrap: "wrap" }}>
        <Tab id="ausgaben" label="Ausgaben" active={activeTab === "ausgaben"} onClick={() => setActiveTab("ausgaben")} />
        <Tab id="sparkonto" label="Sparkonto" active={activeTab === "sparkonto"} onClick={() => setActiveTab("sparkonto")} />
        <Tab id="monatlich" label="Fixkosten" active={activeTab === "monatlich"} onClick={() => setActiveTab("monatlich")} />
        <Tab id="jaehrlich" label="Jährlich" active={activeTab === "jaehrlich"} onClick={() => setActiveTab("jaehrlich")} />
        <Tab id="kategorien" label="Kategorien" active={activeTab === "kategorien"} onClick={() => setActiveTab("kategorien")} />
      </div>

      {/* ─── AUSGABEN ────────────────────────────────────────── */}
      {activeTab === "ausgaben" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Budget summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {[
              { label: "Einkommen", value: `€${fmt(incomeNum)}`, color: "hsl(0 0% 88%)" },
              { label: "Ausgaben " + MONTHS[selectedMonthIdx], value: `€${fmt(totalExpenses)}`, color: "#f87171" },
              { label: "Frei verfügbar", value: `€${fmt(freeBudget)}`, color: freeBudget >= 0 ? "#4ade80" : "#f87171" },
            ].map(s => (
              <div key={s.label} className="wd-card" style={{ padding: 14 }}>
                <Label>{s.label}</Label>
                <div className="mono" style={{ fontSize: "1.1rem", fontWeight: 600, color: s.color }}>{s.value}</div>
                {s.label === "Frei verfügbar" && <div style={{ fontSize: "0.68rem", color: "hsl(0 0% 32%)", marginTop: 2 }}>nach Fixkosten + Ausgaben</div>}
              </div>
            ))}
          </div>

          {/* Add expense */}
          <div className="wd-card" style={{ padding: 16 }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "hsl(0 0% 40%)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>Ausgabe eintragen</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 8, alignItems: "end" }}>
              <div>
                <Label>Bezeichnung</Label>
                <input value={expName} onChange={e => setExpName(e.target.value)} placeholder="z.B. Supermarkt Rewe" onKeyDown={e => e.key === "Enter" && expName && expAmount && addExpMut.mutate({ name: expName, amount: parseFloat(expAmount), category: expCat, month: selectedMonth, date: expDate, note: expNote || null })} />
              </div>
              <div>
                <Label>Betrag (€)</Label>
                <input type="number" value={expAmount} onChange={e => setExpAmount(e.target.value)} placeholder="0.00" step="0.01" style={{ width: 100 }} />
              </div>
              <div>
                <Label>Kategorie</Label>
                <select value={expCat} onChange={e => setExpCat(e.target.value)} style={{ width: 130 }}>
                  {EXPENSE_CATS.map(c => <option key={c} value={c}>{EXPENSE_CAT_LABELS[c]}</option>)}
                </select>
              </div>
              <div>
                <Label>Datum</Label>
                <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} style={{ width: 130 }} />
              </div>
              <button className="btn-cyan" onClick={() => {
                if (!expName || !expAmount) return;
                addExpMut.mutate({ name: expName, amount: parseFloat(expAmount), category: expCat, month: selectedMonth, date: expDate, note: expNote || null });
              }}>+ Hinzufügen</button>
            </div>
          </div>

          {/* Expense list grouped by category */}
          <div className="wd-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div className="section-title">Ausgaben {MONTHS[selectedMonthIdx]}</div>
              <span className="mono" style={{ fontSize: "0.8rem", color: "#f87171" }}>−€{fmt(totalExpenses)}</span>
            </div>
            {expenses.length === 0 && <div style={{ fontSize: "0.78rem", color: "hsl(0 0% 30%)" }}>Noch keine Ausgaben eingetragen</div>}
            {/* Group by category */}
            {EXPENSE_CATS.map(cat => {
              const catItems = [...expenses].filter(e => e.category === cat).sort((a,b) => b.date.localeCompare(a.date));
              if (catItems.length === 0) return null;
              const catTotal = catItems.reduce((s, e) => s + e.amount, 0);
              return (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", marginBottom: 4, borderBottom: "1px solid hsl(0 0% 11%)" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "hsl(0 0% 45%)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{EXPENSE_CAT_LABELS[cat]}</span>
                    <span className="mono" style={{ fontSize: "0.7rem", color: "hsl(0 0% 40%)" }}>€{fmt(catTotal)}</span>
                  </div>
                  {catItems.map(e => (
                    <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", fontSize: "0.83rem" }}>
                      <div style={{ flex: 1 }}>
                        <span style={{ color: "hsl(0 0% 78%)" }}>{e.name}</span>
                        {e.note && <span style={{ color: "hsl(0 0% 38%)", fontSize: "0.72rem", marginLeft: 8 }}>{e.note}</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: "0.68rem", color: "hsl(0 0% 30%)" }}>{new Date(e.date).toLocaleDateString("de-DE")}</span>
                        <span className="mono" style={{ color: "#f87171" }}>−€{fmt(e.amount)}</span>
                        <button className="btn-danger" style={{ padding: "2px 6px", fontSize: "0.62rem" }} onClick={() => delExpMut.mutate(e.id)}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── SPARKONTO ──────────────────────────────────────── */}
      {activeTab === "sparkonto" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="wd-card" style={{ padding: 18 }}>
            <div style={{ marginBottom: 16 }}>
              <Label>Gesamt</Label>
              <div className="mono" style={{ fontSize: "1.8rem", fontWeight: 600, color: "#4ade80" }}>€{fmt(savingsTotal)}</div>
              <div style={{ fontSize: "0.68rem", color: "hsl(0 0% 35%)", marginTop: 2 }}>{savings.length} Einträge</div>
            </div>
            <SavingsChart entries={savings} />
          </div>
          <div className="wd-card" style={{ padding: 16 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>Eintrag hinzufügen</div>
            {/* Type toggle */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {(["einzahlung", "abhebung"] as const).map(t => (
                <button key={t} onClick={() => setSavingsType(t)} style={{
                  padding: "5px 14px", fontSize: "0.72rem", fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                  border: "1px solid", borderRadius: 5, letterSpacing: "0.04em", textTransform: "uppercase" as const,
                  borderColor: savingsType === t ? (t === "einzahlung" ? "rgba(74,222,128,0.45)" : "rgba(248,113,113,0.45)") : "hsl(0 0% 15%)",
                  background: savingsType === t ? (t === "einzahlung" ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)") : "transparent",
                  color: savingsType === t ? (t === "einzahlung" ? "#4ade80" : "#f87171") : "hsl(0 0% 42%)",
                }}>{t === "einzahlung" ? "+ Einzahlung" : "− Abhebung"}</button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, alignItems: "end" }}>
              <div><Label>Betrag (€)</Label><input type="number" value={savingsAmount} onChange={e => setSavingsAmount(e.target.value)} placeholder="100.00" step="0.01" min="0" /></div>
              <div><Label>Notiz</Label><input value={savingsNote} onChange={e => setSavingsNote(e.target.value)} placeholder={savingsType === "einzahlung" ? "z.B. Gehalt" : "z.B. Urlaub"} /></div>
              <div><Label>Datum</Label><input type="date" value={savingsDate} onChange={e => setSavingsDate(e.target.value)} /></div>
              <button
                className="btn-cyan"
                style={savingsType === "abhebung" ? { background: "rgba(248,113,113,0.12)", color: "#f87171", borderColor: "rgba(248,113,113,0.35)" } : {}}
                onClick={() => {
                  if (!savingsAmount) return;
                  const raw = parseFloat(savingsAmount);
                  const amount = savingsType === "abhebung" ? -Math.abs(raw) : Math.abs(raw);
                  addSavingsMut.mutate({ amount, note: savingsNote || null, date: savingsDate });
                  setSavingsAmount(""); setSavingsNote("");
                }}
              >
                {savingsType === "einzahlung" ? "+ Hinzufügen" : "− Abziehen"}
              </button>
            </div>
          </div>
          <div className="wd-card" style={{ padding: 16 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>Verlauf</div>
            {[...savings].sort((a, b) => b.date.localeCompare(a.date)).map(e => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid hsl(0 0% 11%)" }}>
                <div>
                  <span className="mono" style={{ color: e.amount >= 0 ? "#4ade80" : "#f87171", fontWeight: 600 }}>{e.amount >= 0 ? "+" : ""}€{fmt(e.amount)}</span>
                  {e.note && <span style={{ marginLeft: 10, fontSize: "0.75rem", color: "hsl(0 0% 40%)" }}>{e.note}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "0.7rem", color: "hsl(0 0% 32%)" }}>{new Date(e.date).toLocaleDateString("de-DE")}</span>
                  <button className="btn-danger" style={{ padding: "2px 6px", fontSize: "0.62rem" }} onClick={() => delSavingsMut.mutate(e.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── MONATLICHE FIXKOSTEN ──────────────────────────── */}
      {activeTab === "monatlich" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            <div className="wd-card" style={{ padding: 14 }}>
              <Label>Einkommen</Label>
              <div className="mono" style={{ fontSize: "1.1rem", fontWeight: 600, color: "hsl(0 0% 88%)" }}>€{fmt(incomeNum)}</div>
              <input type="number" value={income} onChange={e => setIncome(e.target.value)} placeholder="Gehalt" style={{ marginTop: 8, fontSize: "0.8rem" }}
                onBlur={() => saveBudgetMut.mutate({ month: selectedMonth, income: parseFloat(income) || 0, remainingBudget: incomeNum - totalMonthly })} />
            </div>
            <div className="wd-card" style={{ padding: 14 }}>
              <Label>Fixkosten gesamt</Label>
              <div className="mono" style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f87171" }}>€{fmt(totalMonthly)}</div>
              <div style={{ fontSize: "0.68rem", color: "hsl(0 0% 35%)", marginTop: 2 }}>{activeMonthlyCosts.length} Positionen</div>
            </div>
            <div className="wd-card" style={{ padding: 14 }}>
              <Label>Frei (nach Fixkosten)</Label>
              <div className="mono" style={{ fontSize: "1.1rem", fontWeight: 600, color: (incomeNum - totalMonthly) >= 0 ? "#4ade80" : "#f87171" }}>€{fmt(incomeNum - totalMonthly)}</div>
            </div>
          </div>
          <div className="wd-card" style={{ padding: 16 }}>
            <div className="section-title" style={{ marginBottom: 10 }}>Neue Fixkosten</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 8, alignItems: "end" }}>
              <input value={newCostName} onChange={e => setNewCostName(e.target.value)} placeholder="Name (z.B. Miete)" />
              <input type="number" value={newCostAmount} onChange={e => setNewCostAmount(e.target.value)} placeholder="Betrag €" style={{ width: 110 }} />
              <select value={newCostCat} onChange={e => setNewCostCat(e.target.value)} style={{ width: 130 }}>
                <option value="">Kategorie</option>
                {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
              <button className="btn-cyan" onClick={() => { if (!newCostName || !newCostAmount) return; addMonthlyCostMut.mutate({ name: newCostName, amount: parseFloat(newCostAmount), categoryId: newCostCat ? parseInt(newCostCat) : null, isActive: true }); }}>+ Hinzufügen</button>
            </div>
          </div>
          <div className="wd-card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div className="section-title">Fixkosten {MONTHS[selectedMonthIdx]} {selectedYear}</div>
              <span className="mono" style={{ fontSize: "0.75rem", color: "hsl(0 0% 40%)" }}>€{fmt(paidMonthly)} / €{fmt(totalMonthly)}</span>
            </div>
            <div className="progress-track" style={{ marginBottom: 14 }}>
              <div className="progress-fill" style={{ width: totalMonthly > 0 ? `${(paidMonthly / totalMonthly) * 100}%` : "0%" }} />
            </div>
            {activeMonthlyCosts.map(c => {
              const isChecked = checkedMonthlyIds.has(c.id);
              const cat = categories.find(cat => cat.id === c.categoryId);
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid hsl(0 0% 11%)" }}>
                  <input type="checkbox" checked={isChecked} onChange={e => toggleMonthlyMut.mutate({ costId: c.id, month: selectedMonth, checked: e.target.checked })} />
                  <span style={{ flex: 1, fontSize: "0.85rem", color: "hsl(0 0% 78%)", textDecoration: isChecked ? "line-through" : "none", opacity: isChecked ? 0.45 : 1 }}>{c.name}</span>
                  {cat && <span style={{ fontSize: "0.62rem", padding: "1px 6px", borderRadius: 4, background: cat.color + "18", color: cat.color, border: `1px solid ${cat.color}35` }}>{cat.name}</span>}
                  <span className="mono" style={{ fontSize: "0.85rem", color: isChecked ? "#4ade80" : "hsl(0 0% 55%)" }}>€{fmt(c.amount)}</span>
                  <button className="btn-danger" style={{ padding: "2px 6px", fontSize: "0.62rem" }} onClick={() => delMonthlyCostMut.mutate(c.id)}>✕</button>
                </div>
              );
            })}
            {activeMonthlyCosts.length === 0 && <div style={{ color: "hsl(0 0% 30%)", fontSize: "0.8rem" }}>Noch keine Fixkosten eingetragen</div>}
          </div>
        </div>
      )}

      {/* ─── JÄHRLICHE FIXKOSTEN ──────────────────────────── */}
      {activeTab === "jaehrlich" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            <div className="wd-card" style={{ padding: 14 }}><Label>Jahreskosten gesamt</Label><div className="mono" style={{ fontSize: "1.1rem", fontWeight: 600, color: "#f87171" }}>€{fmt(totalAnnualYear)}</div></div>
            <div className="wd-card" style={{ padding: 14 }}><Label>Bezahlt {selectedYear}</Label><div className="mono" style={{ fontSize: "1.1rem", fontWeight: 600, color: "#4ade80" }}>€{fmt(paidAnnualYear)}</div></div>
            <div className="wd-card" style={{ padding: 14 }}><Label>Fällig in {MONTHS[selectedMonthIdx]}</Label><div className="mono" style={{ fontSize: "1.1rem", fontWeight: 600, color: "#fbbf24" }}>€{fmt(annualThisMonth.reduce((s, c) => s + c.amount, 0))}</div></div>
          </div>
          <div className="wd-card" style={{ padding: 16 }}>
            <div className="section-title" style={{ marginBottom: 10 }}>Neue Jahreskosten</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 8, alignItems: "end" }}>
              <input value={newAnnualName} onChange={e => setNewAnnualName(e.target.value)} placeholder="Name (z.B. KFZ-Versicherung)" />
              <input type="number" value={newAnnualAmount} onChange={e => setNewAnnualAmount(e.target.value)} placeholder="Betrag €" style={{ width: 110 }} />
              <select value={newAnnualMonth} onChange={e => setNewAnnualMonth(e.target.value)} style={{ width: 120 }}>{MONTHS.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}</select>
              <button className="btn-cyan" onClick={() => { if (!newAnnualName || !newAnnualAmount) return; addAnnualCostMut.mutate({ name: newAnnualName, amount: parseFloat(newAnnualAmount), dueMonth: parseInt(newAnnualMonth), isActive: true }); }}>+ Hinzufügen</button>
            </div>
          </div>
          {MONTHS.map((m, mi) => {
            const costsInMonth = annualCosts.filter(c => c.isActive && c.dueMonth === mi + 1);
            if (costsInMonth.length === 0) return null;
            const isCurrent = mi === selectedMonthIdx;
            return (
              <div key={mi} className="wd-card" style={{ padding: 16, borderColor: isCurrent ? "hsl(0 0% 22%)" : undefined }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <div className="section-title" style={{ color: isCurrent ? "hsl(0 0% 85%)" : "hsl(0 0% 40%)" }}>{m} {selectedYear}</div>
                  <span className="mono" style={{ fontSize: "0.75rem", color: "hsl(0 0% 40%)" }}>€{fmt(costsInMonth.reduce((s, c) => s + c.amount, 0))}</span>
                </div>
                {costsInMonth.map(c => {
                  const isChecked = checkedAnnualIds.has(c.id);
                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid hsl(0 0% 11%)" }}>
                      <input type="checkbox" checked={isChecked} onChange={e => toggleAnnualMut.mutate({ costId: c.id, year: selectedYear, checked: e.target.checked })} />
                      <span style={{ flex: 1, fontSize: "0.85rem", color: "hsl(0 0% 78%)", textDecoration: isChecked ? "line-through" : "none", opacity: isChecked ? 0.45 : 1 }}>{c.name}</span>
                      <span className="mono" style={{ fontSize: "0.85rem", color: isChecked ? "#4ade80" : "hsl(0 0% 55%)" }}>€{fmt(c.amount)}</span>
                      <button className="btn-danger" style={{ padding: "2px 6px", fontSize: "0.62rem" }} onClick={() => delAnnualCostMut.mutate(c.id)}>✕</button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── KATEGORIEN ───────────────────────────────────── */}
      {activeTab === "kategorien" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="wd-card" style={{ padding: 16 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>Kategorie hinzufügen</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "end" }}>
              <input value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Name (z.B. Fitness)" />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Label>Farbe</Label>
                <input type="color" value={newCatColor} onChange={e => setNewCatColor(e.target.value)} style={{ width: 36, height: 32, padding: 2, cursor: "pointer" }} />
              </div>
              <button className="btn-cyan" onClick={() => { if (!newCatName) return; addCatMut.mutate({ name: newCatName, color: newCatColor, icon: "tag" }); setNewCatName(""); }}>+ Hinzufügen</button>
            </div>
          </div>
          <div className="wd-card" style={{ padding: 16 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>Alle Kategorien</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 8 }}>
              {categories.map(c => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, border: `1px solid ${c.color}28`, background: `${c.color}0e` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color }} />
                    <span style={{ fontSize: "0.82rem", color: c.color, fontWeight: 500 }}>{c.name}</span>
                  </div>
                  <button className="btn-danger" style={{ padding: "1px 5px", fontSize: "0.6rem" }} onClick={() => delCatMut.mutate(c.id)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
