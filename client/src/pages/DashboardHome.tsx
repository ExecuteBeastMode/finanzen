import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Reminder, TiktokPost, DateIdea } from "@shared/schema";
import CountdownWidget from "@/components/CountdownWidget";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export default function DashboardHome() {
  const today = new Date();
  const currentMonth = today.toISOString().slice(0, 7);

  // ── Finance PIN guard ─────────────────────────────────────────────────────
  // financeVisible = true only after the user entered PIN 3699 in Finanzen.
  // sessionStorage is cleared on every page reload → masked again on refresh.
  const [financeVisible, setFinanceVisible] = useState(() => {
    try { return sessionStorage.getItem("lifeos_finance_unlocked") === "1"; } catch { return false; }
  });
  useEffect(() => {
    const onUnlock = () => setFinanceVisible(true);
    window.addEventListener("lifeos_finance_unlocked", onUnlock);
    return () => window.removeEventListener("lifeos_finance_unlocked", onUnlock);
  }, []);
  // Helper: mask a money string with stars
  const mask = (val: string) => financeVisible ? val : "••••••";

  const { data: reminders = [] } = useQuery<Reminder[]>({ queryKey: ["/api/reminders"] });
  const { data: tiktokPosts = [] } = useQuery<TiktokPost[]>({ queryKey: ["/api/tiktok"] });
  const { data: dateIdeas = [] } = useQuery<DateIdea[]>({ queryKey: ["/api/date-ideas"] });
  const { data: monthlyCosts = [] } = useQuery<any[]>({ queryKey: ["/api/monthly-costs"] });
  const { data: monthlyChecks = [] } = useQuery<any[]>({
    queryKey: ["/api/monthly-costs/checks", currentMonth],
    queryFn: () => apiRequest("GET", `/api/monthly-costs/checks/${currentMonth}`).then(r => r.json()),
  });
  const { data: budget } = useQuery<any>({
    queryKey: ["/api/budget", currentMonth],
    queryFn: () => apiRequest("GET", `/api/budget/${currentMonth}`).then(r => r.json()),
  });
  const { data: savings = [] } = useQuery<any[]>({ queryKey: ["/api/savings"] });
  const { data: expenses = [] } = useQuery<any[]>({
    queryKey: ["/api/expenses", currentMonth],
    queryFn: () => apiRequest("GET", `/api/expenses/${currentMonth}`).then(r => r.json()),
  });

  const savingsTotal = savings.reduce((sum: number, e: any) => sum + e.amount, 0);
  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);

  // Upcoming reminders (next 7 days)
  const upcoming = reminders
    .filter(r => {
      const diff = (new Date(r.date).getTime() - today.getTime()) / 86400000;
      return diff >= 0 && diff <= 7 && !r.done;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // TikTok stats
  const tiktokPosted = tiktokPosts.filter(p => p.status === "posted").length;
  const tiktokInProgress = tiktokPosts.filter(p => p.status === "filming" || p.status === "editing").length;
  const tiktokIdeas = tiktokPosts.filter(p => p.status === "idea").length;

  // Date ideas
  const openDates = dateIdeas.filter(d => !d.done).length;

  // Monthly costs
  const activeCosts = monthlyCosts.filter((c: any) => c.isActive);
  const checkedCount = monthlyChecks.filter((c: any) => c.checked).length;
  const totalCosts = activeCosts.length;
  const checkedAmount = activeCosts
    .filter((c: any) => monthlyChecks.find((ch: any) => ch.costId === c.id && ch.checked))
    .reduce((sum: number, c: any) => sum + c.amount, 0);
  const totalFixed = activeCosts.reduce((sum: number, c: any) => sum + c.amount, 0);

  // Budget
  const income = budget?.income || 0;
  const stillOwed = totalFixed - checkedAmount;
  const freeBudget = income - totalFixed - totalExpenses;
  const barBase = income > 0 ? income : (totalFixed + totalExpenses) || 1;
  const paidPct = Math.min((checkedAmount / barBase) * 100, 100);
  const expensesPct = Math.min((totalExpenses / barBase) * 100, Math.max(0, 100 - paidPct));
  const owedPct = Math.min((stillOwed / barBase) * 100, Math.max(0, 100 - paidPct - expensesPct));
  const freePct = income > 0 ? Math.max(100 - paidPct - expensesPct - owedPct, 0) : 0;

  const monthNames = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
  const fmt = (n: number) => n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={{ padding: "28px 28px 32px", maxWidth: 1080 }}>

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <p style={{ fontSize: "0.7rem", color: "hsl(0 0% 35%)", marginBottom: 4 }}>
            {today.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 600, color: "hsl(0 0% 92%)", letterSpacing: "-0.02em" }}>
            Übersicht
          </h1>
        </div>
        <select
          value={today.getFullYear()}
          disabled
          style={{ padding: "6px 12px", borderRadius: 9, background: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 16%)", color: "hsl(0 0% 60%)", fontSize: "0.82rem", fontWeight: 600, outline: "none", cursor: "default" }}
        >
          {Array.from({ length: 7 }, (_, i) => 2024 + i).map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* ── Budget Card ─────────────────────────────────── */}
      <div className="wd-card" style={{ padding: "20px 22px", marginBottom: 16 }} data-testid="budget-overview-card">

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
          <span className="section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            Budget {monthNames[today.getMonth()]}
            {!financeVisible && (
              <svg viewBox="0 0 24 24" fill="none" stroke="hsl(0 0% 38%)" strokeWidth="1.8" width="13" height="13" style={{ flexShrink: 0 }}>
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            )}
          </span>
          {!financeVisible ? (
            <span style={{ fontSize: "0.68rem", color: "hsl(0 0% 35%)", display: "flex", alignItems: "center", gap: 4 }}>
              PIN in Finanzen eingeben
            </span>
          ) : income === 0 ? (
            <span style={{ fontSize: "0.68rem", color: "hsl(0 0% 35%)" }}>Einkommen in Finanzen eintragen</span>
          ) : null}
        </div>

        {/* 4 stats */}
        <div className="budget-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
          <BudgetStat label="Einkommen"        value={mask(`€${fmt(income)}`)}      />
          <BudgetStat label="Fixkosten gesamt" value={mask(`€${fmt(totalFixed)}`)}   dim />
          <BudgetStat label="Ausgaben"          value={mask(`€${fmt(totalExpenses)}`)} dim />
          <BudgetStat
            label="Frei verfügbar"
            value={mask(`€${fmt(freeBudget)}`)}
            accent
            negative={freeBudget < 0}
          />
        </div>

        {/* Bar — blurred when locked */}
        <div style={{ height: 6, borderRadius: 6, background: "hsl(0 0% 13%)", overflow: "hidden", display: "flex", filter: financeVisible ? "none" : "blur(4px)", transition: "filter 0.3s" }}>
          {paidPct > 0 && (
            <div style={{ width: `${paidPct}%`, background: "#f87171", transition: "width 0.5s ease", flexShrink: 0 }} />
          )}
          {expensesPct > 0 && (
            <div style={{ width: `${expensesPct}%`, background: "#fb923c", transition: "width 0.5s ease", flexShrink: 0 }} />
          )}
          {owedPct > 0 && (
            <div style={{ width: `${owedPct}%`, background: "hsl(0 0% 20%)", transition: "width 0.5s ease", flexShrink: 0 }} />
          )}
          {freePct > 0 && (
            <div style={{ width: `${freePct}%`, background: "#4ade80", transition: "width 0.5s ease", flexShrink: 0 }} />
          )}
        </div>

        {/* Legend */}
        <div className="budget-legend" style={{ display: "flex", gap: 14, marginTop: 8, flexWrap: "wrap" }}>
          <Legend dot="#f87171" label={`Fixkosten bezahlt ${paidPct.toFixed(0)}%`} />
          {expensesPct > 0 && <Legend dot="#fb923c" label={`Ausgaben ${expensesPct.toFixed(0)}%`} />}
          <Legend dot="hsl(0 0% 25%)" label={`Noch fällig ${owedPct.toFixed(0)}%`} />
          {freePct > 0 && <Legend dot="#4ade80" label={`Frei ${freePct.toFixed(0)}%`} />}
        </div>
      </div>

      {/* ── KPI Row ──────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        <KpiCard label="Sparkonto"     value={mask(`€${savingsTotal.toLocaleString("de-DE", { minimumFractionDigits: 2 })}`)} />
        <KpiCard label="TikTok"        value={`${tiktokPosted} Posts`} sub={`${tiktokInProgress} aktiv · ${tiktokIdeas} Ideen`} />
        <KpiCard label="Date Ideen"    value={`${openDates} offen`} />
        <KpiCard label={`Fixkosten ${monthNames[today.getMonth()]}`} value={`${checkedCount}/${totalCosts}`} sub={financeVisible ? `€${fmt(checkedAmount)} von €${fmt(totalFixed)}` : "••• von •••"} />
      </div>

      {/* ── Main Grid ────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* Upcoming */}
        <div className="wd-card" style={{ padding: "18px 20px" }}>
          <div className="section-title" style={{ marginBottom: 14 }}>Nächste 7 Tage</div>
          {upcoming.length === 0 ? (
            <Empty>Keine anstehenden Termine</Empty>
          ) : upcoming.map(r => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 0", borderBottom: "1px solid hsl(0 0% 11%)" }}>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "hsl(0 0% 85%)" }}>{r.title}</div>
                {r.note && <div style={{ fontSize: "0.72rem", color: "hsl(0 0% 40%)", marginTop: 1 }}>{r.note}</div>}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
                <div style={{ fontSize: "0.7rem", color: r.type === "birthday" ? "#f472b6" : "hsl(0 0% 45%)" }}>
                  {r.type === "birthday" ? "Geburtstag" : r.type === "appointment" ? "Termin" : "Erinnerung"}
                </div>
                <div style={{ fontSize: "0.68rem", color: "hsl(0 0% 32%)", marginTop: 1 }}>
                  {new Date(r.date).toLocaleDateString("de-DE")}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Fixkosten progress */}
        <div className="wd-card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div className="section-title">Fixkosten {monthNames[today.getMonth()]}</div>
            <span style={{ fontSize: "0.72rem", color: "hsl(0 0% 40%)" }}>{checkedCount}/{totalCosts}</span>
          </div>
          <div className="progress-track" style={{ marginBottom: 12 }}>
            <div className="progress-fill" style={{ width: totalCosts > 0 ? `${(checkedCount / totalCosts) * 100}%` : "0%" }} />
          </div>
          {activeCosts.slice(0, 7).map((c: any) => {
            const check = monthlyChecks.find((ch: any) => ch.costId === c.id && ch.checked);
            return (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "0.82rem", opacity: check ? 0.4 : 1 }}>
                <span style={{ textDecoration: check ? "line-through" : "none", color: "hsl(0 0% 75%)" }}>{c.name}</span>
                <span className="mono" style={{ color: check ? "#4ade80" : "hsl(0 0% 55%)" }}>{financeVisible ? `€${fmt(c.amount)}` : "•••"}</span>
              </div>
            );
          })}
          {activeCosts.length === 0 && <Empty>Keine Fixkosten eingetragen</Empty>}
        </div>

        {/* TikTok pipeline */}
        <div className="wd-card" style={{ padding: "18px 20px" }}>
          <div className="section-title" style={{ marginBottom: 14 }}>TikTok Pipeline</div>
          {tiktokPosts.length === 0 ? (
            <Empty>Noch keine Posts geplant</Empty>
          ) : tiktokPosts.slice(0, 6).map(p => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid hsl(0 0% 11%)" }}>
              <span style={{ fontSize: "0.83rem", color: "hsl(0 0% 78%)", flex: 1, marginRight: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
              <span className={`wd-tag status-${p.status}`} style={{ flexShrink: 0, fontSize: "0.64rem" }}>{p.status}</span>
            </div>
          ))}
        </div>

        {/* Countdowns */}
        <CountdownWidget />

        {/* Date idea */}
        <div className="wd-card" style={{ padding: "18px 20px" }}>
          <div className="section-title" style={{ marginBottom: 14 }}>Date Vorschlag</div>
          {(() => {
            const open = dateIdeas.filter(d => !d.done);
            if (open.length === 0) return <Empty>Noch keine Date Ideen eingetragen</Empty>;
            const pick = open[Math.floor(Math.random() * open.length)];
            return (
              <div>
                <div style={{ fontSize: "0.95rem", fontWeight: 500, color: "hsl(0 0% 88%)", marginBottom: 6 }}>{pick.title}</div>
                {pick.description && (
                  <div style={{ fontSize: "0.78rem", color: "hsl(0 0% 45%)", marginBottom: 10, lineHeight: 1.5 }}>{pick.description}</div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  <span className="wd-tag">{pick.category}</span>
                  <span className="wd-tag">{pick.season}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function BudgetStat({ label, value, accent, negative, dim }: {
  label: string; value: string; accent?: boolean; negative?: boolean; dim?: boolean;
}) {
  const valueColor = accent
    ? negative ? "#f87171" : "#4ade80"
    : dim ? "hsl(0 0% 55%)" : "hsl(0 0% 88%)";
  return (
    <div style={{
      padding: "10px 12px",
      background: accent ? "hsl(0 0% 10%)" : "transparent",
      border: accent ? "1px solid hsl(0 0% 15%)" : "1px solid transparent",
      borderRadius: 8,
    }}>
      <div style={{ fontSize: "0.62rem", color: "hsl(0 0% 35%)", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
      <div className="mono" style={{ fontSize: "0.95rem", fontWeight: 600, color: valueColor }}>{value}</div>
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="wd-card" style={{ padding: "14px 16px" }}>
      <div style={{ fontSize: "0.62rem", color: "hsl(0 0% 35%)", marginBottom: 5, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
      <div className="mono" style={{ fontSize: "0.95rem", fontWeight: 600, color: "hsl(0 0% 88%)" }}>{value}</div>
      {sub && <div style={{ fontSize: "0.7rem", color: "hsl(0 0% 38%)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.66rem", color: "hsl(0 0% 38%)" }}>
      <span style={{ width: 7, height: 7, borderRadius: 2, background: dot, display: "inline-block", flexShrink: 0 }} />
      {label}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: "0.78rem", color: "hsl(0 0% 32%)", paddingTop: 4 }}>{children}</div>;
}
