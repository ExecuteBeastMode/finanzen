import { useEffect, useRef, useState } from "react";

const W = Math.min(360, window.innerWidth - 32);
const H = Math.round(W * 1.2);
const PAD_W = W * 0.22;
const PAD_H = 10;
const PAD_Y  = H - 40;
const BALL_R = 7;
const ROWS   = 6;
const COLS   = 8;
const BRICK_W = (W - COLS * 4 - 4) / COLS;
const BRICK_H = 18;
const BRICK_GAP = 4;
const BRICK_TOP = 48;

const ROW_COLORS = ["#f87171","#fb923c","#fbbf24","#4ade80","#60a5fa","#a78bfa"];

interface Brick { x: number; y: number; alive: boolean; color: string; }

function buildBricks(): Brick[] {
  const bricks: Brick[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      bricks.push({
        x: BRICK_GAP/2 + c * (BRICK_W + BRICK_GAP) + 2,
        y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
        alive: true,
        color: ROW_COLORS[r],
      });
    }
  }
  return bricks;
}

export default function BreakoutPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef  = useRef({
    padX:   W/2 - PAD_W/2,
    ballX:  W/2,
    ballY:  PAD_Y - BALL_R - 2,
    vx:     3.2,
    vy:    -3.8,
    bricks: buildBricks(),
    lives:  3,
    score:  0,
    started: false,
    dead:    false,
    won:     false,
    animId:  0,
  });
  const [ui, setUi] = useState({ score: 0, lives: 3, dead: false, won: false, started: false });
  const [best, setBest] = useState(() => parseInt(localStorage.getItem("lifeos_breakout_best") ?? "0"));

  function draw() {
    const s = stateRef.current;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "hsl(0 0% 5%)";
    ctx.fillRect(0, 0, W, H);

    // bricks
    s.bricks.forEach(b => {
      if (!b.alive) return;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, BRICK_W, BRICK_H, 4);
      ctx.fill();
    });

    // paddle
    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.roundRect(s.padX, PAD_Y, PAD_W, PAD_H, 5);
    ctx.fill();

    // ball
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(s.ballX, s.ballY, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    // lives dots
    for (let i = 0; i < s.lives; i++) {
      ctx.fillStyle = "#4ade80";
      ctx.beginPath();
      ctx.arc(12 + i * 18, 16, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // score
    ctx.fillStyle = "hsl(0 0% 65%)";
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(String(s.score), W - 8, 20);
    ctx.textAlign = "left";
  }

  function step() {
    const s = stateRef.current;
    if (s.dead || s.won || !s.started) { draw(); return; }

    s.ballX += s.vx;
    s.ballY += s.vy;

    // walls
    if (s.ballX - BALL_R < 0) { s.ballX = BALL_R; s.vx = Math.abs(s.vx); }
    if (s.ballX + BALL_R > W) { s.ballX = W - BALL_R; s.vx = -Math.abs(s.vx); }
    if (s.ballY - BALL_R < 0) { s.ballY = BALL_R; s.vy = Math.abs(s.vy); }

    // paddle
    if (
      s.ballY + BALL_R >= PAD_Y &&
      s.ballY + BALL_R <= PAD_Y + PAD_H + Math.abs(s.vy) &&
      s.ballX >= s.padX - BALL_R &&
      s.ballX <= s.padX + PAD_W + BALL_R
    ) {
      s.vy = -Math.abs(s.vy);
      // angle based on hit pos
      const rel = (s.ballX - (s.padX + PAD_W/2)) / (PAD_W/2);
      s.vx = rel * 5;
      s.ballY = PAD_Y - BALL_R - 1;
    }

    // bottom
    if (s.ballY + BALL_R > H) {
      s.lives--;
      setUi(u => ({ ...u, lives: s.lives }));
      if (s.lives <= 0) {
        s.dead = true;
        if (s.score > best) { setBest(s.score); localStorage.setItem("lifeos_breakout_best", String(s.score)); }
        setUi(u => ({ ...u, dead: true, score: s.score }));
      } else {
        s.ballX = s.padX + PAD_W/2;
        s.ballY = PAD_Y - BALL_R - 2;
        s.vy    = -3.8;
        s.vx    = 3.2 * (Math.random() > 0.5 ? 1 : -1);
        s.started = false;
        setUi(u => ({ ...u, started: false }));
      }
    }

    // bricks
    for (const b of s.bricks) {
      if (!b.alive) continue;
      if (
        s.ballX + BALL_R > b.x && s.ballX - BALL_R < b.x + BRICK_W &&
        s.ballY + BALL_R > b.y && s.ballY - BALL_R < b.y + BRICK_H
      ) {
        b.alive = false;
        s.score += 10;
        setUi(u => ({ ...u, score: s.score }));
        // bounce direction
        const overlapL = s.ballX + BALL_R - b.x;
        const overlapR = b.x + BRICK_W - (s.ballX - BALL_R);
        const overlapT = s.ballY + BALL_R - b.y;
        const overlapB = b.y + BRICK_H - (s.ballY - BALL_R);
        const minH = Math.min(overlapL, overlapR);
        const minV = Math.min(overlapT, overlapB);
        if (minH < minV) s.vx *= -1; else s.vy *= -1;
        break;
      }
    }

    // win
    if (s.bricks.every(b => !b.alive)) {
      s.won = true;
      if (s.score > best) { setBest(s.score); localStorage.setItem("lifeos_breakout_best", String(s.score)); }
      setUi(u => ({ ...u, won: true, score: s.score }));
    }

    draw();
    s.animId = requestAnimationFrame(step);
  }

  useEffect(() => {
    const s = stateRef.current;
    s.animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(s.animId);
  }, []);

  // Mouse/touch move
  function movePad(clientX: number) {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left - PAD_W/2;
    stateRef.current.padX = Math.max(0, Math.min(W - PAD_W, x));
    if (!stateRef.current.started && !stateRef.current.dead && !stateRef.current.won) {
      stateRef.current.ballX = stateRef.current.padX + PAD_W/2;
    }
  }

  function startBall() {
    const s = stateRef.current;
    if (s.dead || s.won) { resetGame(); return; }
    if (!s.started) {
      s.started = true;
      s.vy = -3.8;
      s.vx = 3.2 * (Math.random() > 0.5 ? 1 : -1);
      setUi(u => ({ ...u, started: true }));
      cancelAnimationFrame(s.animId);
      s.animId = requestAnimationFrame(step);
    }
  }

  function resetGame() {
    cancelAnimationFrame(stateRef.current.animId);
    const s = stateRef.current;
    s.padX = W/2 - PAD_W/2;
    s.ballX = W/2; s.ballY = PAD_Y - BALL_R - 2;
    s.vx = 3.2; s.vy = -3.8;
    s.bricks = buildBricks();
    s.lives = 3; s.score = 0;
    s.started = false; s.dead = false; s.won = false;
    setUi({ score: 0, lives: 3, dead: false, won: false, started: false });
    s.animId = requestAnimationFrame(step);
  }

  // keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.key === " ") { startBall(); e.preventDefault(); }
      if (e.key === "ArrowLeft")  { s.padX = Math.max(0, s.padX - 20); if (!s.started) s.ballX = s.padX + PAD_W/2; }
      if (e.key === "ArrowRight") { s.padX = Math.min(W - PAD_W, s.padX + 20); if (!s.started) s.ballX = s.padX + PAD_W/2; }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div style={{ padding: "20px 16px 100px", maxWidth: 480, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h1 style={{ fontSize: "1.1rem", fontWeight: 700, color: "hsl(0 0% 90%)" }}>Breakout</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#4ade80" }}>{ui.score}</div>
            <div style={{ fontSize: "0.58rem", color: "hsl(0 0% 38%)" }}>Score</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "hsl(0 0% 55%)" }}>{best}</div>
            <div style={{ fontSize: "0.58rem", color: "hsl(0 0% 38%)" }}>Best</div>
          </div>
          <button onClick={resetGame} style={{
            padding: "6px 12px", borderRadius: 8, background: "hsl(0 0% 10%)",
            border: "1px solid hsl(0 0% 18%)", color: "hsl(0 0% 50%)", cursor: "pointer", fontSize: "0.75rem",
          }}>↺</button>
        </div>
      </div>

      <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid hsl(0 0% 14%)", display: "inline-block" }}>
        <canvas
          ref={canvasRef} width={W} height={H}
          onMouseMove={e => movePad(e.clientX)}
          onTouchMove={e => { e.preventDefault(); movePad(e.touches[0].clientX); }}
          onTouchStart={e => { e.preventDefault(); movePad(e.touches[0].clientX); startBall(); }}
          onClick={startBall}
          style={{ display: "block", touchAction: "none", cursor: "none" }}
        />
        {(!ui.started && !ui.dead && !ui.won) && (
          <div style={{
            position: "absolute", bottom: 60, left: 0, right: 0,
            textAlign: "center", color: "hsl(0 0% 45%)", fontSize: "0.75rem", pointerEvents: "none",
          }}>Tippen / Klicken zum Starten</div>
        )}
        {(ui.dead || ui.won) && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.72)", gap: 10,
          }}>
            <div style={{ fontSize: "1.8rem" }}>{ui.won ? "🏆" : "💀"}</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: ui.won ? "#4ade80" : "#f87171" }}>
              {ui.won ? "Gewonnen!" : "Game Over"}
            </div>
            <div style={{ fontSize: "0.78rem", color: "hsl(0 0% 55%)" }}>Score: {ui.score}</div>
            <button onClick={resetGame} style={{
              marginTop: 8, padding: "10px 24px", borderRadius: 10,
              background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.35)",
              color: "#4ade80", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer",
            }}>Nochmal</button>
          </div>
        )}
      </div>
      <div style={{ marginTop: 8, fontSize: "0.65rem", color: "hsl(0 0% 30%)" }}>
        Maus/Finger bewegen = Paddle · Tippen/Klicken = Start
      </div>
    </div>
  );
}
