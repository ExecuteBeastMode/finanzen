import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────
type Grid = (number | null)[][];
type Difficulty = "easy" | "medium" | "hard";

// ─── Sudoku Generator ────────────────────────────────────────────────────────
function createEmptyGrid(): Grid {
  return Array.from({ length: 9 }, () => Array(9).fill(null));
}

function isValid(grid: Grid, row: number, col: number, num: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (grid[row][i] === num) return false;
    if (grid[i][col] === num) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++)
    for (let c = bc; c < bc + 3; c++)
      if (grid[r][c] === num) return false;
  return true;
}

function fillGrid(grid: Grid): boolean {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === null) {
        const nums = shuffle([1,2,3,4,5,6,7,8,9]);
        for (const num of nums) {
          if (isValid(grid, row, col, num)) {
            grid[row][col] = num;
            if (fillGrid(grid)) return true;
            grid[row][col] = null;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generatePuzzle(difficulty: Difficulty): { puzzle: Grid; solution: Grid } {
  const solution = createEmptyGrid();
  fillGrid(solution);

  const removeCounts: Record<Difficulty, number> = { easy: 35, medium: 46, hard: 54 };
  const removeCount = removeCounts[difficulty];

  const puzzle = solution.map(row => [...row]) as Grid;
  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as [number, number])
  );
  for (let i = 0; i < removeCount; i++) {
    const [r, c] = positions[i];
    puzzle[r][c] = null;
  }
  return { puzzle, solution };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function deepClone(g: Grid): Grid { return g.map(r => [...r]); }

function gridComplete(grid: Grid, solution: Grid): boolean {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (grid[r][c] !== solution[r][c]) return false;
  return true;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

const LS_KEY = "lifeos_sudoku_best";

function getBest(diff: Difficulty): number | null {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}");
    return raw[diff] ?? null;
  } catch { return null; }
}

function saveBest(diff: Difficulty, secs: number) {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}");
    if (!raw[diff] || secs < raw[diff]) {
      raw[diff] = secs;
      localStorage.setItem(LS_KEY, JSON.stringify(raw));
    }
  } catch {}
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function SudokuPage() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [puzzle, setPuzzle] = useState<Grid>(createEmptyGrid());
  const [solution, setSolution] = useState<Grid>(createEmptyGrid());
  const [userGrid, setUserGrid] = useState<Grid>(createEmptyGrid());
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [timer, setTimer] = useState(0);
  const [running, setRunning] = useState(false);
  const [won, setWon] = useState(false);
  const [started, setStarted] = useState(false);
  const [notes, setNotes] = useState<Set<number>[][][]>(
    Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [new Set<number>()]))
  );
  const [noteMode, setNoteMode] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const best = getBest(difficulty);

  const startGame = useCallback((diff: Difficulty) => {
    const { puzzle: p, solution: s } = generatePuzzle(diff);
    setPuzzle(p);
    setSolution(s);
    setUserGrid(deepClone(p));
    setSelected(null);
    setMistakes(0);
    setTimer(0);
    setWon(false);
    setStarted(true);
    setRunning(true);
    setNoteMode(false);
    setNotes(Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [new Set<number>()])));
  }, []);

  // Timer
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const handleCellClick = (r: number, c: number) => {
    setSelected([r, c]);
  };

  const handleNumber = useCallback((num: number) => {
    if (!selected || won) return;
    const [r, c] = selected;
    if (puzzle[r][c] !== null) return; // Vorgegebene Zahl

    if (noteMode) {
      const newNotes = notes.map(row => row.map(cell => [new Set(cell[0])]));
      const cellNotes = newNotes[r][c][0];
      if (cellNotes.has(num)) cellNotes.delete(num);
      else cellNotes.add(num);
      setNotes(newNotes);
      return;
    }

    const newGrid = deepClone(userGrid);
    if (newGrid[r][c] === num) {
      newGrid[r][c] = null;
    } else {
      newGrid[r][c] = num;
      if (solution[r][c] !== num) {
        setMistakes(m => m + 1);
      } else {
        // Clear notes for this cell
        const newNotes = notes.map(row => row.map(cell => [new Set(cell[0])]));
        newNotes[r][c][0].clear();
        setNotes(newNotes);
      }
    }
    setUserGrid(newGrid);

    if (gridComplete(newGrid, solution)) {
      setWon(true);
      setRunning(false);
      saveBest(difficulty, timer);
    }
  }, [selected, won, puzzle, userGrid, solution, noteMode, notes, difficulty, timer]);

  const handleErase = () => {
    if (!selected || won) return;
    const [r, c] = selected;
    if (puzzle[r][c] !== null) return;
    const newGrid = deepClone(userGrid);
    newGrid[r][c] = null;
    setUserGrid(newGrid);
    const newNotes = notes.map(row => row.map(cell => [new Set(cell[0])]));
    newNotes[r][c][0].clear();
    setNotes(newNotes);
  };

  // Keyboard input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!started || won) return;
      const n = parseInt(e.key);
      if (n >= 1 && n <= 9) handleNumber(n);
      if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") handleErase();
      if (e.key === "n" || e.key === "N") setNoteMode(m => !m);
      // Arrow keys
      if (selected) {
        const [r, c] = selected;
        if (e.key === "ArrowUp" && r > 0) setSelected([r - 1, c]);
        if (e.key === "ArrowDown" && r < 8) setSelected([r + 1, c]);
        if (e.key === "ArrowLeft" && c > 0) setSelected([r, c - 1]);
        if (e.key === "ArrowRight" && c < 8) setSelected([r, c + 1]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [started, won, selected, handleNumber]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedNum = selected ? userGrid[selected[0]][selected[1]] : null;

  const diffColors: Record<Difficulty, { bg: string; color: string; border: string }> = {
    easy: { bg: "rgba(74,222,128,0.12)", color: "#4ade80", border: "rgba(74,222,128,0.3)" },
    medium: { bg: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "rgba(251,191,36,0.3)" },
    hard: { bg: "rgba(239,68,68,0.12)", color: "#f87171", border: "rgba(239,68,68,0.3)" },
  };

  return (
    <div style={{ padding: "20px 16px 100px", maxWidth: 420, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 700, color: "hsl(0 0% 92%)", letterSpacing: "-0.02em", marginBottom: 2 }}>Sudoku</h1>
          <p style={{ fontSize: "0.72rem", color: "hsl(0 0% 40%)" }}>
            {best ? `Bestzeit (${difficulty}): ${formatTime(best)}` : "Kein Rekord gesetzt"}
          </p>
        </div>
        {started && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, color: won ? "#4ade80" : "hsl(0 0% 78%)", fontVariantNumeric: "tabular-nums" }}>
              {formatTime(timer)}
            </div>
            <div style={{ fontSize: "0.65rem", color: mistakes >= 3 ? "#f87171" : "hsl(0 0% 38%)" }}>
              Fehler: {mistakes}/3
            </div>
          </div>
        )}
      </div>

      {/* Difficulty selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(["easy", "medium", "hard"] as Difficulty[]).map(d => {
          const dc = diffColors[d];
          const active = difficulty === d;
          return (
            <button
              key={d}
              onClick={() => { setDifficulty(d); if (!started) {} }}
              style={{
                flex: 1, padding: "8px 0", borderRadius: 10, border: "none", cursor: "pointer",
                background: active ? dc.bg : "hsl(0 0% 9%)",
                color: active ? dc.color : "hsl(0 0% 45%)",
                fontSize: "0.78rem", fontWeight: 600,
                outline: active ? `1px solid ${dc.border}` : "1px solid hsl(0 0% 14%)",
                transition: "all 0.12s",
                WebkitTapHighlightColor: "transparent" as any,
              }}
            >
              {d === "easy" ? "Leicht" : d === "medium" ? "Mittel" : "Schwer"}
            </button>
          );
        })}
      </div>

      {/* Start / New Game button */}
      {(!started || won) && (
        <button
          onClick={() => startGame(difficulty)}
          style={{
            width: "100%", padding: "13px", borderRadius: 12, border: "none", cursor: "pointer",
            background: "rgba(74,222,128,0.15)", color: "#4ade80",
            fontSize: "0.92rem", fontWeight: 700, letterSpacing: "0.02em",
            outline: "1px solid rgba(74,222,128,0.3)",
            marginBottom: 18,
            WebkitTapHighlightColor: "transparent" as any,
          }}
        >
          {won ? "Neues Spiel" : "Spiel starten"}
        </button>
      )}

      {won && (
        <div style={{
          padding: "16px", borderRadius: 14, marginBottom: 16, textAlign: "center",
          background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)"
        }}>
          <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>🎉</div>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#4ade80", marginBottom: 2 }}>Gelöst!</div>
          <div style={{ fontSize: "0.78rem", color: "hsl(0 0% 50%)" }}>Zeit: {formatTime(timer)} · Fehler: {mistakes}</div>
          {best !== null && timer <= best && (
            <div style={{ fontSize: "0.72rem", color: "#fbbf24", marginTop: 4 }}>🏆 Neue Bestzeit!</div>
          )}
        </div>
      )}

      {/* Grid */}
      {started && (
        <>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(9, 1fr)",
            gap: 0, border: "2px solid hsl(0 0% 25%)", borderRadius: 10,
            overflow: "hidden", marginBottom: 16, userSelect: "none",
          }}>
            {Array.from({ length: 9 }, (_, r) =>
              Array.from({ length: 9 }, (_, c) => {
                const val = userGrid[r][c];
                const given = puzzle[r][c] !== null;
                const isSelected = selected?.[0] === r && selected?.[1] === c;
                const sameNum = selectedNum !== null && val === selectedNum && val !== null;
                const sameRow = selected && selected[0] === r;
                const sameCol = selected && selected[1] === c;
                const sameBox = selected && Math.floor(selected[0] / 3) === Math.floor(r / 3) && Math.floor(selected[1] / 3) === Math.floor(c / 3);
                const isWrong = !given && val !== null && val !== solution[r][c];
                const cellNotes = notes[r][c][0];

                const borderRight = (c + 1) % 3 === 0 && c !== 8 ? "2px solid hsl(0 0% 25%)" : "1px solid hsl(0 0% 14%)";
                const borderBottom = (r + 1) % 3 === 0 && r !== 8 ? "2px solid hsl(0 0% 25%)" : "1px solid hsl(0 0% 14%)";

                let bg = "hsl(0 0% 6%)";
                if (isSelected) bg = "rgba(74,222,128,0.2)";
                else if (sameNum) bg = "rgba(74,222,128,0.1)";
                else if (sameRow || sameCol || sameBox) bg = "hsl(0 0% 9%)";

                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleCellClick(r, c)}
                    style={{
                      width: "100%", aspectRatio: "1/1",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: bg,
                      borderRight, borderBottom,
                      cursor: "pointer",
                      position: "relative",
                      transition: "background 0.08s",
                      WebkitTapHighlightColor: "transparent" as any,
                      touchAction: "manipulation" as any,
                    }}
                  >
                    {val !== null ? (
                      <span style={{
                        fontSize: "clamp(0.85rem, 3.5vw, 1.1rem)",
                        fontWeight: given ? 700 : 500,
                        color: isWrong ? "#f87171" : given ? "hsl(0 0% 88%)" : "#60a5fa",
                        lineHeight: 1,
                      }}>
                        {val}
                      </span>
                    ) : cellNotes.size > 0 ? (
                      <div style={{
                        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
                        width: "85%", height: "85%", gap: 0,
                      }}>
                        {[1,2,3,4,5,6,7,8,9].map(n => (
                          <span key={n} style={{
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "clamp(0.35rem, 1.2vw, 0.5rem)",
                            color: cellNotes.has(n) ? "#fbbf24" : "transparent",
                            lineHeight: 1,
                          }}>{n}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          {/* Action buttons row */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, justifyContent: "space-between" }}>
            <button
              onClick={handleErase}
              style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid hsl(0 0% 16%)", background: "hsl(0 0% 9%)", color: "hsl(0 0% 60%)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", WebkitTapHighlightColor: "transparent" as any }}
            >
              Löschen
            </button>
            <button
              onClick={() => setNoteMode(m => !m)}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer",
                background: noteMode ? "rgba(251,191,36,0.12)" : "hsl(0 0% 9%)",
                color: noteMode ? "#fbbf24" : "hsl(0 0% 55%)",
                fontSize: "0.75rem", fontWeight: 600,
                outline: noteMode ? "1px solid rgba(251,191,36,0.3)" : "1px solid hsl(0 0% 15%)",
                WebkitTapHighlightColor: "transparent" as any,
              }}
            >
              Notiz {noteMode ? "AN" : "AUS"}
            </button>
            <button
              onClick={() => startGame(difficulty)}
              style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid hsl(0 0% 16%)", background: "hsl(0 0% 9%)", color: "hsl(0 0% 55%)", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer", WebkitTapHighlightColor: "transparent" as any }}
            >
              Neu
            </button>
          </div>

          {/* Number pad */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(9, 1fr)", gap: 5 }}>
            {[1,2,3,4,5,6,7,8,9].map(n => {
              const count = userGrid.flat().filter(v => v === n).length;
              const full = count >= 9;
              return (
                <button
                  key={n}
                  onClick={() => handleNumber(n)}
                  disabled={full}
                  style={{
                    aspectRatio: "1/1", borderRadius: 9, border: "none", cursor: full ? "default" : "pointer",
                    background: full ? "hsl(0 0% 7%)" : "hsl(0 0% 11%)",
                    color: full ? "hsl(0 0% 25%)" : selectedNum === n ? "#4ade80" : "hsl(0 0% 80%)",
                    fontSize: "clamp(0.9rem, 3vw, 1.2rem)", fontWeight: 700,
                    outline: selectedNum === n && !full ? "1px solid rgba(74,222,128,0.3)" : "none",
                    transition: "all 0.1s",
                    WebkitTapHighlightColor: "transparent" as any,
                    touchAction: "manipulation" as any,
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </>
      )}

      {!started && (
        <div style={{ padding: "30px 0", textAlign: "center", color: "hsl(0 0% 30%)", fontSize: "0.82rem" }}>
          Wähle einen Schwierigkeitsgrad und starte das Spiel
        </div>
      )}
    </div>
  );
}
