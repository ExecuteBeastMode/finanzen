import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Countdown } from "@shared/schema";

const COLOR_MAP: Record<string, { bg: string; border: string; text: string }> = {
  green:  { bg: "rgba(74,222,128,0.08)",  border: "rgba(74,222,128,0.22)",  text: "#4ade80" },
  blue:   { bg: "rgba(96,165,250,0.08)",  border: "rgba(96,165,250,0.22)",  text: "#60a5fa" },
  red:    { bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.22)", text: "#f87171" },
  purple: { bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.22)", text: "#a78bfa" },
  orange: { bg: "rgba(251,146,60,0.08)",  border: "rgba(251,146,60,0.22)",  text: "#fb923c" },
};

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

const EMOJIS = ["🎯","🎉","✈️","🎂","🏆","💪","🎵","❤️","🌴","🎓"];

export default function CountdownWidget() {
  const { data: countdowns = [] } = useQuery<Countdown[]>({ queryKey: ["/api/countdowns"] });
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [color, setColor] = useState("green");

  const addMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/countdowns", d).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/countdowns"] });
      setTitle(""); setDate(""); setShowForm(false);
    }
  });
  const delMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/countdowns/${id}`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/countdowns"] })
  });

  const sorted = [...countdowns].sort((a, b) => a.date.localeCompare(b.date));
  const inputStyle: React.CSSProperties = {
    padding: "7px 10px", borderRadius: 8, background: "hsl(0 0% 8%)",
    border: "1px solid hsl(0 0% 16%)", color: "hsl(0 0% 88%)",
    fontSize: "0.8rem", outline: "none", width: "100%"
  };

  return (
    <div className="wd-card" style={{ padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div className="section-title">Countdowns</div>
        <button
          onClick={() => setShowForm(v => !v)}
          style={{ fontSize: "0.72rem", padding: "4px 10px", borderRadius: 7, background: showForm ? "rgba(74,222,128,0.1)" : "hsl(0 0% 11%)", border: `1px solid ${showForm ? "rgba(74,222,128,0.3)" : "hsl(0 0% 17%)"}`, color: showForm ? "#4ade80" : "hsl(0 0% 50%)", cursor: "pointer" }}
        >
          + Neu
        </button>
      </div>

      {showForm && (
        <div style={{ background: "hsl(0 0% 7%)", borderRadius: 10, padding: "12px", marginBottom: 14, border: "1px solid hsl(0 0% 13%)" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ereignis (z.B. Urlaub)" style={{ ...inputStyle, flex: 1 }} />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, width: 130 }} />
          </div>
          {/* Emoji picker */}
          <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)} style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${emoji === e ? "rgba(74,222,128,0.4)" : "hsl(0 0% 16%)"}`, background: emoji === e ? "rgba(74,222,128,0.1)" : "transparent", cursor: "pointer", fontSize: "0.9rem" }}>{e}</button>
            ))}
          </div>
          {/* Color picker */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center" }}>
            <span style={{ fontSize: "0.68rem", color: "hsl(0 0% 40%)" }}>Farbe:</span>
            {Object.entries(COLOR_MAP).map(([k, v]) => (
              <button key={k} onClick={() => setColor(k)} style={{ width: 18, height: 18, borderRadius: 5, background: v.text, border: `2px solid ${color === k ? "white" : "transparent"}`, cursor: "pointer", outline: "none" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: "7px", borderRadius: 8, background: "hsl(0 0% 11%)", border: "1px solid hsl(0 0% 17%)", color: "hsl(0 0% 50%)", fontSize: "0.78rem", cursor: "pointer" }}>Abbrechen</button>
            <button
              onClick={() => { if (title && date) addMut.mutate({ title, date, emoji, color }); }}
              style={{ flex: 2, padding: "7px", borderRadius: 8, background: "#4ade80", border: "none", color: "#0a0a0a", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}
            >
              Speichern
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 && !showForm && (
        <div style={{ fontSize: "0.78rem", color: "hsl(0 0% 32%)", paddingTop: 4 }}>Noch keine Countdowns eingetragen</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map(cd => {
          const days = daysUntil(cd.date);
          const c = COLOR_MAP[cd.color] ?? COLOR_MAP.green;
          const isToday = days === 0;
          const isPast = days < 0;
          return (
            <div key={cd.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: c.bg, border: `1px solid ${c.border}` }}>
              <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{cd.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "hsl(0 0% 88%)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cd.title}</div>
                <div style={{ fontSize: "0.68rem", color: "hsl(0 0% 40%)", marginTop: 1 }}>{cd.date}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {isToday ? (
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: c.text }}>Heute 🎉</div>
                ) : isPast ? (
                  <div style={{ fontSize: "0.78rem", color: "hsl(0 0% 38%)" }}>vor {Math.abs(days)}d</div>
                ) : (
                  <>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: c.text, letterSpacing: "-0.02em" }}>{days}</div>
                    <div style={{ fontSize: "0.6rem", color: "hsl(0 0% 38%)" }}>Tage</div>
                  </>
                )}
              </div>
              <button onClick={() => delMut.mutate(cd.id)} style={{ width: 24, height: 24, borderRadius: 6, background: "transparent", border: "none", color: "hsl(0 0% 35%)", cursor: "pointer", fontSize: "0.7rem", flexShrink: 0 }}>✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
