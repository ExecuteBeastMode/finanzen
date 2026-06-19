import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
type Board = (number | 0)[][];
type Dir = "up" | "down" | "left" | "right";

// ─── Tile colours ────────────────────────────────────────────────────────────
const TILE_STYLE: Record<number, { bg: string; color: string; fontSize?: string }> = {
  0:    { bg: "hsl(0 0% 10%)",           color: "transparent" },
  2:    { bg: "hsl(0 0% 16%)",           color: "hsl(0 0% 82%)" },
  4:    { bg: "hsl(0 0% 20%)",           color: "hsl(0 0% 88%)" },
  8:    { bg: "rgba(251,146,60,0.55)",   color: "#fff" },
  16:   { bg: "rgba(251,146,60,0.75)",   color: "#fff" },
  32:   { bg: "rgba(248,113,113,0.7)",   color: "#fff" },
  64:   { bg: "rgba(248,113,113,0.9)",   color: "#fff" },
  128:  { bg: "rgba(167,139,250,0.75)",  color: "#fff", fontSize: "1.1rem" },
  256:  { bg: "rgba(167,139,250,0.9)",   color: "#fff", fontSize: "1.1rem" },
  512:  { bg: "rgba(96,165,250,0.75)",   color: "#fff", fontSize: "1.1rem" },
  1024: { bg: "rgba(96,165,250,0.9)",    color: "#fff", fontSize: "0.9rem" },
  2048: { bg: "rgba(74,222,128,0.9)",    color: "#0a0a0a", fontSize: "0.9rem" },
};

function getTileStyle(val: number) {
  if (TILE_STYLE[val]) return TILE_STYLE[val];
  return { bg: "rgba(74,222,128,1)", color: "#0a0a0a", fontSize: "0.75rem" };
}

// ─── Game Logic ───────────────────────────────────────────────────────────────
function empty(): Board {
  return Array.from({ length: 4 }, () => [0, 0, 0, 0]);
}

function addRandom(board: Board): Board {
  const b = board.map(r => [...r]) as Board;
  const empties: [number, number][] = [];
  b.forEach((row, r) => row.forEach((v, c) => { if (v === 0) empties.push([r, c]); }));
  if (empties.length === 0) return b;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  b[r][c] = Math.random() < 0.9 ? 2 : 4;
  return b;
}

function initBoard(): Board {
  return addRandom(addRandom(empty()));
}

function slideRow(row: number[]): { row: number[]; score: number } {
  const nums = row.filter(v => v !== 0);
  let score = 0;
  const merged: number[] = [];
  let i = 0;
  while (i < nums.length) {
    if (i + 1 < nums.length && nums[i] === nums[i + 1]) {
      const val = nums[i] * 2;
      merged.push(val);
      score += val;
      i += 2;
    } else {
      merged.push(nums[i]);
      i++;
    }
  }
  while (merged.length < 4) merged.push(0);
  return { row: merged, score };
}

function moveBoard(board: Board, dir: Dir): { board: Board; score: number; moved: boolean } {
  let b = board.map(r => [...r]) as Board;
  let totalScore = 0;
  let moved = false;

  const transpose = (m: Board): Board => m[0].map((_, c) => m.map(r => r[c])) as Board;
  const reverse   = (m: Board): Board => m.map(r => [...r].reverse()) as Board;

  if (dir === "left" || dir === "right") {
    if (dir === "right") b = reverse(b);
    b = b.map(row => {
      const { row: newRow, score } = slideRow(row);
      totalScore += score;
      if (newRow.join() !== row.join()) moved = true;
      return newRow;
    }) as Board;
    if (dir === "right") b = reverse(b);
  } else {
    b = transpose(b);
    if (dir === "down") b = reverse(b);
    b = b.map(row => {
      const { row: newRow, score } = slideRow(row);
      totalScore += score;
      if (newRow.join() !== row.join()) moved = true;
      return newRow;
    }) as Board;
    if (dir === "down") b = reverse(b);
    b = transpose(b);
  }

  return { board: b, score: totalScore, moved };
}

function hasWon(board: Board) {
  return board.some(row => row.some(v => v >= 2048));
}

function canMove(board: Board) {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) return true;
      if (c < 3 && board[r][c] === board[r][c + 1]) return true;
      if (r < 3 && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

const HS_KEY = "life_os_2048_highscore";

// ─── Component ────────────────────────────────────────────────────────────────
export default function Game2048() {
  const [board, setBoard]         = useState<Board>(initBoard);
  const [score, setScore]         = useState(0);
  const [best, setBest]           = useState(() => parseInt(localStorage.getItem(HS_KEY) ?? "0"));
  const [gameOver, setGameOver]   = useState(false);
  const [won, setWon]             = useState(false);
  const [keepPlaying, setKeepPlaying] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const move = useCallback((dir: Dir) => {
    setBoard(prev => {
      const { board: next, score: gained, moved } = moveBoard(prev, dir);
      if (!moved) return prev;
      const withNew = addRandom(next);
      setScore(s => {
        const ns = s + gained;
        setBest(b => {
          const nb = Math.max(b, ns);
          localStorage.setItem(HS_KEY, String(nb));
          return nb;
        });
        return ns;
      });
      if (!keepPlaying && hasWon(withNew)) setWon(true);
      if (!canMove(withNew)) setGameOver(true);
      return withNew;
    });
  }, [keepPlaying]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", s: "down", a: "left", d: "right",
      };
      if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [move]);

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
    else move(dy > 0 ? "down" : "up");
  };

  const restart = () => {
    setBoard(initBoard());
    setScore(0);
    setGameOver(false);
    setWon(false);
    setKeepPlaying(false);
  };

  // Board size: responsive
  const boardSize = Math.min(340, typeof window !== "undefined" ? window.innerWidth - 32 : 340);
  const gap = 8;
  const tileSize = (boardSize - gap * 5) / 4;

  return (
    <div style={{ padding: "24px 16px 100px", maxWidth: 420, margin: "0 auto", userSelect: "none" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "#4ade80", letterSpacing: "-0.04em", lineHeight: 1 }}>2048</h1>
          <p style={{ fontSize: "0.72rem", color: "hsl(0 0% 38%)", marginTop: 4 }}>
            Pfeiltasten · WASD · Swipe
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* Score boxes */}
          <ScoreBox label="Punkte" value={score} />
          <ScoreBox label="Highscore" value={best} highlight />
          {/* New Game */}
          <button
            onClick={restart}
            style={{ padding: "8px 14px", borderRadius: 10, background: "#4ade80", border: "none", color: "#0a0a0a", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer", height: 52, whiteSpace: "nowrap" }}
          >
            Neu
          </button>
        </div>
      </div>

      {/* Board */}
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: "relative",
          width: boardSize, height: boardSize,
          background: "hsl(0 0% 8%)",
          borderRadius: 14,
          padding: gap,
          boxSizing: "border-box",
          border: "1px solid hsl(0 0% 14%)",
          margin: "0 auto",
          touchAction: "none",
        }}
      >
        {/* Background cells */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(4, ${tileSize}px)`, gap, position: "absolute", top: gap, left: gap }}>
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} style={{ width: tileSize, height: tileSize, borderRadius: 8, background: "hsl(0 0% 12%)" }} />
          ))}
        </div>

        {/* Tiles */}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(4, ${tileSize}px)`, gap, position: "relative", zIndex: 1 }}>
          {board.flat().map((val, i) => {
            const s = getTileStyle(val);
            return (
              <div
                key={i}
                style={{
                  width: tileSize, height: tileSize, borderRadius: 8,
                  background: s.bg,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: s.fontSize ?? (val >= 1000 ? "0.95rem" : "1.2rem"),
                  fontWeight: 800, color: s.color,
                  transition: "background 0.1s",
                  letterSpacing: "-0.03em",
                }}
              >
                {val !== 0 ? val : ""}
              </div>
            );
          })}
        </div>

        {/* Overlay: Won */}
        {won && !keepPlaying && (
          <Overlay>
            <div style={{ fontSize: "2rem" }}>🏆</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#4ade80", margin: "8px 0" }}>2048 erreicht!</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setKeepPlaying(true)} style={overlayBtn("#4ade80", "#0a0a0a")}>Weiterspielen</button>
              <button onClick={restart} style={overlayBtn("hsl(0 0% 16%)", "hsl(0 0% 88%)")}>Neu starten</button>
            </div>
          </Overlay>
        )}

        {/* Overlay: Game Over */}
        {gameOver && (
          <Overlay>
            <div style={{ fontSize: "2rem" }}>😵</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f87171", margin: "8px 0" }}>Game Over</div>
            <div style={{ fontSize: "0.82rem", color: "hsl(0 0% 55%)", marginBottom: 12 }}>Punkte: {score}</div>
            <button onClick={restart} style={overlayBtn("#f87171", "#fff")}>Nochmal</button>
          </Overlay>
        )}
      </div>

      {/* How to play */}
      <div style={{ marginTop: 20, padding: "12px 14px", borderRadius: 10, background: "hsl(0 0% 7%)", border: "1px solid hsl(0 0% 12%)" }}>
        <p style={{ fontSize: "0.72rem", color: "hsl(0 0% 40%)", lineHeight: 1.6, margin: 0 }}>
          <strong style={{ color: "hsl(0 0% 60%)" }}>Wie man spielt:</strong> Bewege alle Kacheln mit den Pfeiltasten oder WASD. Gleiche Kacheln verschmelzen zu einer. Erreiche <strong style={{ color: "#4ade80" }}>2048</strong> um zu gewinnen!
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ScoreBox({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{ padding: "6px 12px", borderRadius: 10, background: highlight ? "rgba(74,222,128,0.08)" : "hsl(0 0% 10%)", border: `1px solid ${highlight ? "rgba(74,222,128,0.2)" : "hsl(0 0% 15%)"}`, textAlign: "center", minWidth: 64, height: 52, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: "0.55rem", color: "hsl(0 0% 38%)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: "1rem", fontWeight: 700, color: highlight ? "#4ade80" : "hsl(0 0% 88%)", letterSpacing: "-0.02em" }}>{value}</div>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 10,
      background: "rgba(5,5,5,0.82)", backdropFilter: "blur(6px)",
      borderRadius: 14,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      gap: 4
    }}>
      {children}
    </div>
  );
}

function overlayBtn(bg: string, color: string): React.CSSProperties {
  return { padding: "9px 18px", borderRadius: 10, background: bg, border: "none", color, fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" };
}
