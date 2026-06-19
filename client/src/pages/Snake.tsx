import { useState, useEffect, useRef, useCallback } from "react";

const COLS = 20;
const ROWS = 20;
const TICK = 130;

type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Pt  = { x: number; y: number };

function rand(max: number) { return Math.floor(Math.random() * max); }
function newFood(snake: Pt[]): Pt {
  let f: Pt;
  do { f = { x: rand(COLS), y: rand(ROWS) }; }
  while (snake.some(s => s.x === f.x && s.y === f.y));
  return f;
}

export default function SnakePage() {
  const [snake, setSnake]   = useState<Pt[]>([{ x: 10, y: 10 }]);
  const [food,  setFood]    = useState<Pt>({ x: 5, y: 5 });
  const [dir,   setDir]     = useState<Dir>("RIGHT");
  const [alive, setAlive]   = useState(false);
  const [score, setScore]   = useState(0);
  const [best,  setBest]    = useState(() => parseInt(localStorage.getItem("lifeos_snake_best") ?? "0"));
  const [dead,  setDead]    = useState(false);
  const nextDir = useRef<Dir>("RIGHT");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const CELL = Math.min(Math.floor((Math.min(window.innerWidth - 32, 400)) / COLS), 20);
  const W = COLS * CELL;
  const H = ROWS * CELL;

  // Draw
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "hsl(0 0% 5%)";
    ctx.fillRect(0, 0, W, H);
    // grid dots
    ctx.fillStyle = "hsl(0 0% 9%)";
    for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) {
      ctx.fillRect(x * CELL + CELL/2 - 1, y * CELL + CELL/2 - 1, 2, 2);
    }
    // food
    ctx.fillStyle = "#f87171";
    ctx.beginPath();
    ctx.arc(food.x * CELL + CELL/2, food.y * CELL + CELL/2, CELL/2 - 2, 0, Math.PI * 2);
    ctx.fill();
    // snake
    snake.forEach((s, i) => {
      const alpha = 0.5 + 0.5 * (i / snake.length);
      ctx.fillStyle = i === 0 ? "#4ade80" : `rgba(74,222,128,${alpha * 0.8})`;
      const r = i === 0 ? CELL/2 - 1 : CELL/2 - 2;
      ctx.beginPath();
      ctx.roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, r);
      ctx.fill();
    });
  }, [snake, food, W, H, CELL]);

  // Tick
  useEffect(() => {
    if (!alive) return;
    const id = setInterval(() => {
      setDir(nextDir.current);
      setSnake(prev => {
        const head = prev[0];
        const d = nextDir.current;
        const next: Pt = {
          x: (head.x + (d === "RIGHT" ? 1 : d === "LEFT" ? -1 : 0) + COLS) % COLS,
          y: (head.y + (d === "DOWN"  ? 1 : d === "UP"   ? -1 : 0) + ROWS) % ROWS,
        };
        if (prev.some(s => s.x === next.x && s.y === next.y)) {
          setAlive(false); setDead(true);
          setScore(s => { const ns = prev.length - 1; if (ns > best) { setBest(ns); localStorage.setItem("lifeos_snake_best", String(ns)); } return ns; });
          return prev;
        }
        const ate = next.x === food.x && next.y === food.y;
        const newSnake = [next, ...prev];
        if (!ate) newSnake.pop();
        else setFood(newFood(newSnake));
        setScore(newSnake.length - 1);
        return newSnake;
      });
    }, TICK);
    return () => clearInterval(id);
  }, [alive, food, best]);

  // Keys
  useEffect(() => {
    const map: Record<string, Dir> = { ArrowUp:"UP", ArrowDown:"DOWN", ArrowLeft:"LEFT", ArrowRight:"RIGHT", w:"UP", s:"DOWN", a:"LEFT", d:"RIGHT" };
    const opp: Record<Dir,Dir> = { UP:"DOWN", DOWN:"UP", LEFT:"RIGHT", RIGHT:"LEFT" };
    const h = (e: KeyboardEvent) => {
      const d = map[e.key];
      if (d && d !== opp[nextDir.current]) { nextDir.current = d; e.preventDefault(); }
      if (e.key === " ") { if (!alive) startGame(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [alive]);

  const startGame = useCallback(() => {
    const start = [{ x: 10, y: 10 }];
    setSnake(start);
    setFood(newFood(start));
    nextDir.current = "RIGHT";
    setDir("RIGHT");
    setScore(0);
    setDead(false);
    setAlive(true);
  }, []);

  // Touch swipe
  const touchStart = useRef<Pt | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    const opp: Record<Dir,Dir> = { UP:"DOWN", DOWN:"UP", LEFT:"RIGHT", RIGHT:"LEFT" };
    let d: Dir | null = null;
    if (Math.abs(dx) > Math.abs(dy)) d = dx > 0 ? "RIGHT" : "LEFT";
    else d = dy > 0 ? "DOWN" : "UP";
    if (d && d !== opp[nextDir.current]) nextDir.current = d;
    if (!alive && !dead) startGame();
  };

  return (
    <div style={{ padding: "20px 16px 100px", maxWidth: 480, margin: "0 auto" }}>
      <h1 style={{ fontSize: "1.1rem", fontWeight: 700, color: "hsl(0 0% 90%)", marginBottom: 4 }}>Snake</h1>
      <div style={{ display: "flex", gap: 16, marginBottom: 14, alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#4ade80" }}>{score}</div>
          <div style={{ fontSize: "0.62rem", color: "hsl(0 0% 38%)" }}>Score</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "hsl(0 0% 60%)" }}>{best}</div>
          <div style={{ fontSize: "0.62rem", color: "hsl(0 0% 38%)" }}>Best</div>
        </div>
        {!alive && (
          <button onClick={startGame} style={{
            marginLeft: "auto", padding: "10px 20px", borderRadius: 10,
            background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)",
            color: "#4ade80", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
          }}>{dead ? "Nochmal" : "Start"}</button>
        )}
      </div>

      <div style={{ position: "relative", display: "inline-block", borderRadius: 12, overflow: "hidden", border: "1px solid hsl(0 0% 14%)" }}>
        <canvas
          ref={canvasRef} width={W} height={H}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{ display: "block", touchAction: "none" }}
        />
        {!alive && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.7)", gap: 12,
          }}>
            {dead && <div style={{ fontSize: "1rem", fontWeight: 700, color: "#f87171" }}>Game Over</div>}
            <div style={{ fontSize: "0.78rem", color: "hsl(0 0% 55%)" }}>
              {dead ? `Score: ${score}` : "Pfeiltasten / Wischen"}
            </div>
            <button onClick={startGame} style={{
              padding: "10px 24px", borderRadius: 10,
              background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.35)",
              color: "#4ade80", fontWeight: 700, fontSize: "0.88rem", cursor: "pointer",
            }}>{dead ? "Nochmal" : "Spielen"}</button>
          </div>
        )}
      </div>

      {/* D-Pad for mobile */}
      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        {[
          { label: "▲", dir: "UP"   as Dir, row: 1, col: 2 },
          { label: "◄", dir: "LEFT" as Dir, row: 2, col: 1 },
          { label: "►", dir: "RIGHT" as Dir, row: 2, col: 3 },
          { label: "▼", dir: "DOWN" as Dir, row: 3, col: 2 },
        ].reduce<JSX.Element[]>((acc, btn, _, arr) => {
          const opp: Record<Dir,Dir> = { UP:"DOWN", DOWN:"UP", LEFT:"RIGHT", RIGHT:"LEFT" };
          const btnEl = (
            <button
              key={btn.dir}
              onTouchStart={e => { e.preventDefault(); if (!alive) startGame(); else { nextDir.current = btn.dir; } }}
              onClick={() => { if (!alive) startGame(); else nextDir.current = btn.dir; }}
              style={{
                width: 52, height: 52, borderRadius: 10,
                background: "hsl(0 0% 10%)", border: "1px solid hsl(0 0% 18%)",
                color: "hsl(0 0% 65%)", fontSize: "1.2rem", cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                gridRow: btn.row, gridColumn: btn.col,
              }}
            >{btn.label}</button>
          );
          return [...acc, btnEl];
        }, []).reduce<JSX.Element[][]>((rows, _, i, all) => {
          if (i === 0) return [[all[0]]]; // UP
          if (i === 1) return [...rows, [all[1], all[2]]]; // LEFT + RIGHT
          if (i === 3) return [...rows, [all[3]]]; // DOWN
          return rows;
        }, []).map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: 4 }}>{row}</div>
        ))}
      </div>
    </div>
  );
}
