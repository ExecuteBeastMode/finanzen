import { useState, useEffect, useRef } from "react";

const EMOJIS = ["🔥","⚡","🎯","💎","🚀","🌊","🎸","🦁","🍀","🎃","🌙","🎪"];

interface Card {
  id: number;
  emoji: string;
  flipped: boolean;
  matched: boolean;
}

type Diff = 4 | 6 | 8;

function buildDeck(pairs: Diff): Card[] {
  const pool = EMOJIS.slice(0, pairs);
  const cards = [...pool, ...pool]
    .sort(() => Math.random() - 0.5)
    .map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
  return cards;
}

export default function MemoryPage() {
  const [diff,    setDiff]    = useState<Diff>(6);
  const [cards,   setCards]   = useState<Card[]>(() => buildDeck(6));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves,   setMoves]   = useState(0);
  const [won,     setWon]     = useState(false);
  const [locked,  setLocked]  = useState(false);
  const [time,    setTime]    = useState(0);
  const [running, setRunning] = useState(false);
  const [best,    setBest]    = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem("lifeos_memory_best") ?? "{}"); } catch { return {}; }
  });
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Timer
  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [running]);

  const cols = diff <= 4 ? 4 : diff <= 6 ? 4 : 4;
  const totalCards = diff * 2;

  function startGame(d: Diff = diff) {
    setCards(buildDeck(d));
    setFlipped([]);
    setMoves(0);
    setWon(false);
    setLocked(false);
    setTime(0);
    setRunning(false);
  }

  function flip(id: number) {
    if (locked) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;
    if (!running) setRunning(true);

    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);
    setCards(prev => prev.map(c => c.id === id ? { ...c, flipped: true } : c));

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setLocked(true);
      const [a, b] = newFlipped.map(fid => cards.find(c => c.id === fid)!);
      if (a.emoji === b.emoji) {
        // match
        setTimeout(() => {
          setCards(prev => {
            const next = prev.map(c => newFlipped.includes(c.id) ? { ...c, matched: true } : c);
            const allMatched = next.every(c => c.matched);
            if (allMatched) {
              setWon(true);
              setRunning(false);
              setTime(t => {
                const key = String(diff);
                setBest(b => {
                  const cur = b[key] ?? Infinity;
                  const updated = t < cur ? { ...b, [key]: t } : b;
                  localStorage.setItem("lifeos_memory_best", JSON.stringify(updated));
                  return updated;
                });
                return t;
              });
            }
            return next;
          });
          setFlipped([]);
          setLocked(false);
        }, 400);
      } else {
        // no match
        setTimeout(() => {
          setCards(prev => prev.map(c => newFlipped.includes(c.id) ? { ...c, flipped: false } : c));
          setFlipped([]);
          setLocked(false);
        }, 800);
      }
    }
  }

  const fmtTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  return (
    <div style={{ padding: "20px 16px 100px", maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.1rem", fontWeight: 700, color: "hsl(0 0% 90%)", marginBottom: 14 }}>Memory</h1>

      {/* Difficulty */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {([4, 6, 8] as Diff[]).map(d => (
          <button key={d} onClick={() => { setDiff(d); startGame(d); }}
            style={{
              flex: 1, padding: "8px", borderRadius: 9, cursor: "pointer", fontWeight: 600,
              fontSize: "0.75rem", border: "1px solid",
              borderColor: diff === d ? "rgba(74,222,128,0.4)" : "hsl(0 0% 16%)",
              background: diff === d ? "rgba(74,222,128,0.1)" : "hsl(0 0% 8%)",
              color: diff === d ? "#4ade80" : "hsl(0 0% 45%)",
            }}>
            {d === 4 ? "Leicht (8)" : d === 6 ? "Mittel (12)" : "Schwer (16)"}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[
          { label: "Züge", val: moves },
          { label: "Zeit", val: fmtTime(time) },
          { label: `Best ${diff}P`, val: best[String(diff)] != null ? fmtTime(best[String(diff)]!) : "—" },
        ].map(s => (
          <div key={s.label} className="wd-card" style={{ flex: 1, padding: "10px", textAlign: "center" }}>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#4ade80" }}>{s.val}</div>
            <div style={{ fontSize: "0.6rem", color: "hsl(0 0% 38%)" }}>{s.label}</div>
          </div>
        ))}
        <button onClick={() => startGame()}
          style={{
            padding: "10px 14px", borderRadius: 10, cursor: "pointer", fontWeight: 600,
            fontSize: "0.75rem", border: "1px solid hsl(0 0% 18%)",
            background: "hsl(0 0% 9%)", color: "hsl(0 0% 55%)",
          }}>↺</button>
      </div>

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 8,
      }}>
        {cards.map(card => (
          <div
            key={card.id}
            onClick={() => flip(card.id)}
            style={{
              aspectRatio: "1",
              borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.6rem",
              cursor: card.matched || card.flipped ? "default" : "pointer",
              background: card.matched
                ? "rgba(74,222,128,0.12)"
                : card.flipped
                ? "hsl(0 0% 12%)"
                : "hsl(0 0% 9%)",
              border: card.matched
                ? "1px solid rgba(74,222,128,0.35)"
                : card.flipped
                ? "1px solid hsl(0 0% 20%)"
                : "1px solid hsl(0 0% 14%)",
              transition: "background 0.15s, border-color 0.15s",
              userSelect: "none",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {card.flipped || card.matched ? card.emoji : ""}
          </div>
        ))}
      </div>

      {/* Win overlay */}
      {won && (
        <div style={{
          marginTop: 24, padding: "24px 16px", borderRadius: 16, textAlign: "center",
          background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.3)",
        }}>
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>🏆</div>
          <div style={{ fontSize: "1rem", fontWeight: 700, color: "#4ade80" }}>{fmtTime(time)} · {moves} Züge</div>
          <div style={{ fontSize: "0.75rem", color: "hsl(0 0% 50%)", marginTop: 4, marginBottom: 16 }}>
            {best[String(diff)] === time ? "Neuer Rekord! 🎉" : "Gut gemacht!"}
          </div>
          <button onClick={() => startGame()} style={{
            padding: "10px 24px", borderRadius: 10,
            background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.35)",
            color: "#4ade80", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
          }}>Nochmal</button>
        </div>
      )}
    </div>
  );
}
