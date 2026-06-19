import { useState, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Flashcard {
  id: number;
  question: string;
  answer: string;
  topic: string;
}

type QuizMode = "idle" | "studying" | "quiz-mc" | "quiz-input";
type CardStatus = "unseen" | "correct" | "wrong";

// ─── Text Parser ──────────────────────────────────────────────────────────────
function extractFlashcards(text: string): Flashcard[] {
  const cards: Flashcard[] = [];
  let id = 1;

  // Split text into meaningful chunks
  const lines = text
    .split(/\n+/)
    .map(l => l.trim())
    .filter(l => l.length > 10);

  // 1. Explicit Q&A patterns: "Frage: ... Antwort: ..." or "Q: ... A: ..."
  const qaPattern = /(?:frage|question|q)[:\s]+(.+?)[\n\r]+(?:antwort|answer|a)[:\s]+(.+)/gi;
  let m;
  while ((m = qaPattern.exec(text)) !== null) {
    cards.push({
      id: id++,
      question: m[1].trim(),
      answer: m[2].trim(),
      topic: "Dokument",
    });
  }

  // 2. Definition patterns: "Begriff: Definition" or "Begriff = Definition" or "Begriff — Definition"
  const defPattern = /^([A-ZÄÖÜ][^:=—\n]{2,40})\s*[:=—]\s*(.{10,300})$/;
  for (const line of lines) {
    if (cards.length >= 50) break;
    const dm = line.match(defPattern);
    if (dm) {
      const already = cards.some(c => c.question.toLowerCase() === (`Was ist ${dm[1].trim()}?`).toLowerCase());
      if (!already) {
        cards.push({
          id: id++,
          question: `Was ist ${dm[1].trim()}?`,
          answer: dm[2].trim(),
          topic: "Definitionen",
        });
      }
    }
  }

  // 3. Sentence-based: extract sentences with key verbs (ist, sind, bedeutet, heißt, bezeichnet)
  const sentences = text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 30 && s.length < 300);

  const keyTermPattern = /(.{3,40})\s+(?:ist|sind|bedeutet|heißt|bezeichnet|beschreibt|nennt man|versteht man)\s+(.{10,200})/i;
  for (const sentence of sentences) {
    if (cards.length >= 60) break;
    const sm = sentence.match(keyTermPattern);
    if (sm) {
      const subject = sm[1].trim().replace(/^(der|die|das|ein|eine|als)\s+/i, "");
      if (subject.length < 3) continue;
      const already = cards.some(c => c.answer === sentence.trim());
      if (!already) {
        cards.push({
          id: id++,
          question: `Was ${sentence.match(/sind/i) ? "sind" : "ist"} ${subject}?`,
          answer: sentence.trim(),
          topic: "Konzepte",
        });
      }
    }
  }

  // 4. Numbered / bulleted list items → turn each into a "Was besagt Punkt X?" question
  const listPattern = /^(?:\d+[.)]\s*|[-•*]\s*)(.{15,200})$/;
  const listItems: string[] = [];
  for (const line of lines) {
    const lm = line.match(listPattern);
    if (lm) listItems.push(lm[1].trim());
  }
  if (listItems.length >= 3 && cards.length < 60) {
    // Find heading before the list if possible
    const listTopic = "Aufzählung";
    listItems.slice(0, 20).forEach((item, i) => {
      if (cards.length >= 60) return;
      cards.push({
        id: id++,
        question: `Nenne Punkt ${i + 1} der Aufzählung.`,
        answer: item,
        topic: listTopic,
      });
    });
  }

  // Deduplicate by answer similarity (very basic)
  const seen = new Set<string>();
  return cards.filter(c => {
    const key = c.answer.slice(0, 60).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Multiple Choice generator ────────────────────────────────────────────────
function buildMCOptions(correct: string, allCards: Flashcard[]): string[] {
  const distractors = allCards
    .map(c => c.answer)
    .filter(a => a !== correct)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  const options = [...distractors, correct].sort(() => Math.random() - 0.5);
  return options;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LernenPage() {
  const fileRef = useRef<HTMLInputElement>(null);

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<QuizMode>("idle");

  // Study mode
  const [studyIndex, setStudyIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [statuses, setStatuses] = useState<Record<number, CardStatus>>({});

  // Quiz MC mode
  const [quizIndex, setQuizIndex] = useState(0);
  const [mcOptions, setMcOptions] = useState<string[]>([]);
  const [mcSelected, setMcSelected] = useState<string | null>(null);
  const [mcCorrect, setMcCorrect] = useState<boolean | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  // Quiz Input mode
  const [inputAnswer, setInputAnswer] = useState("");
  const [inputResult, setInputResult] = useState<boolean | null>(null);
  const [inputScore, setInputScore] = useState(0);

  // Tab filter
  const [topicFilter, setTopicFilter] = useState("Alle");

  // ─── File Upload ────────────────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    setLoading(true);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || "";
      const extracted = extractFlashcards(text);
      setCards(extracted);
      setStatuses({});
      setMode("idle");
      setLoading(false);
    };
    reader.readAsText(file, "utf-8");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // ─── Filtered cards ─────────────────────────────────────────────────────────
  const topics = ["Alle", ...Array.from(new Set(cards.map(c => c.topic)))];
  const filtered = topicFilter === "Alle" ? cards : cards.filter(c => c.topic === topicFilter);

  // ─── Study mode helpers ──────────────────────────────────────────────────────
  const startStudy = () => {
    setMode("studying");
    setStudyIndex(0);
    setFlipped(false);
  };

  const markCard = (status: "correct" | "wrong") => {
    setStatuses(prev => ({ ...prev, [filtered[studyIndex].id]: status }));
    if (studyIndex < filtered.length - 1) {
      setStudyIndex(i => i + 1);
      setFlipped(false);
    } else {
      setMode("idle");
    }
  };

  // ─── MC Quiz helpers ─────────────────────────────────────────────────────────
  const startMCQuiz = () => {
    setMode("quiz-mc");
    setQuizIndex(0);
    setQuizScore(0);
    setQuizDone(false);
    setMcSelected(null);
    setMcCorrect(null);
    const opts = buildMCOptions(filtered[0].answer, cards);
    setMcOptions(opts);
  };

  const handleMCSelect = (option: string) => {
    if (mcSelected !== null) return;
    const correct = option === filtered[quizIndex].answer;
    setMcSelected(option);
    setMcCorrect(correct);
    if (correct) setQuizScore(s => s + 1);
  };

  const nextMC = () => {
    const next = quizIndex + 1;
    if (next >= filtered.length) {
      setQuizDone(true);
      return;
    }
    setQuizIndex(next);
    setMcSelected(null);
    setMcCorrect(null);
    setMcOptions(buildMCOptions(filtered[next].answer, cards));
  };

  // ─── Input Quiz helpers ──────────────────────────────────────────────────────
  const startInputQuiz = () => {
    setMode("quiz-input");
    setQuizIndex(0);
    setInputScore(0);
    setQuizDone(false);
    setInputAnswer("");
    setInputResult(null);
  };

  const checkInput = () => {
    const expected = filtered[quizIndex].answer.toLowerCase();
    const given = inputAnswer.toLowerCase().trim();
    // Accept if given text is contained in the answer or vice versa (lenient)
    const ok = expected.includes(given) || given.includes(expected.split(" ").slice(0, 5).join(" "));
    setInputResult(ok);
    if (ok) setInputScore(s => s + 1);
  };

  const nextInput = () => {
    const next = quizIndex + 1;
    if (next >= filtered.length) {
      setQuizDone(true);
      return;
    }
    setQuizIndex(next);
    setInputAnswer("");
    setInputResult(null);
  };

  // ─── Stats ──────────────────────────────────────────────────────────────────
  const correct = Object.values(statuses).filter(s => s === "correct").length;
  const wrong = Object.values(statuses).filter(s => s === "wrong").length;

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 12px 100px" }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "1.1rem", fontWeight: 700, color: "hsl(0 0% 90%)", margin: 0, letterSpacing: "-0.02em" }}>
          Lernkarten
        </h1>
        <p style={{ fontSize: "0.72rem", color: "hsl(0 0% 38%)", margin: "4px 0 0" }}>
          Lade ein Textdokument hoch — Fragen werden automatisch erstellt
        </p>
      </div>

      {/* Upload Zone */}
      <div
        className="wd-card"
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: "1px dashed hsl(0 0% 20%)",
          borderRadius: 14,
          padding: "28px 16px",
          textAlign: "center",
          cursor: "pointer",
          marginBottom: 16,
          background: "hsl(0 0% 6%)",
          transition: "border-color 0.2s",
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.csv,.rtf,text/*"
          style={{ display: "none" }}
          onChange={handleInputChange}
        />
        {loading ? (
          <div style={{ color: "#4ade80", fontSize: "0.82rem" }}>⏳ Analysiere Dokument…</div>
        ) : fileName ? (
          <div>
            <div style={{ fontSize: "0.8rem", color: "#4ade80", fontWeight: 600, marginBottom: 4 }}>
              ✓ {fileName}
            </div>
            <div style={{ fontSize: "0.68rem", color: "hsl(0 0% 40%)" }}>
              {cards.length} Lernkarten gefunden · Klick zum Wechseln
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: "0.82rem", color: "hsl(0 0% 55%)", marginBottom: 4 }}>
              .txt oder .md Datei hochladen
            </div>
            <div style={{ fontSize: "0.68rem", color: "hsl(0 0% 30%)" }}>
              Drag & Drop oder Klick
            </div>
          </div>
        )}
      </div>

      {cards.length === 0 && !loading && (
        <div className="wd-card" style={{ padding: "16px", textAlign: "center" }}>
          <p style={{ fontSize: "0.78rem", color: "hsl(0 0% 35%)", margin: 0 }}>
            Noch keine Karten. Lade eine .txt oder .md Datei mit deinen Lernnotizen hoch.
          </p>
          <p style={{ fontSize: "0.68rem", color: "hsl(0 0% 25%)", margin: "8px 0 0" }}>
            Tipp: Nutze Formate wie "Begriff: Definition", nummerierte Listen oder vollständige Sätze.
          </p>
        </div>
      )}

      {cards.length > 0 && (
        <>
          {/* Topic Filter */}
          {topics.length > 2 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
              {topics.map(t => (
                <button
                  key={t}
                  onClick={() => setTopicFilter(t)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 999,
                    border: "1px solid",
                    borderColor: topicFilter === t ? "rgba(74,222,128,0.4)" : "hsl(0 0% 16%)",
                    background: topicFilter === t ? "rgba(74,222,128,0.1)" : "hsl(0 0% 7%)",
                    color: topicFilter === t ? "#4ade80" : "hsl(0 0% 50%)",
                    fontSize: "0.7rem",
                    cursor: "pointer",
                    fontWeight: topicFilter === t ? 600 : 400,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* Stats row */}
          {(correct + wrong) > 0 && mode === "idle" && (
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <div className="wd-card" style={{ flex: 1, padding: "10px 14px", textAlign: "center" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#4ade80" }}>{correct}</div>
                <div style={{ fontSize: "0.65rem", color: "hsl(0 0% 40%)" }}>Gewusst</div>
              </div>
              <div className="wd-card" style={{ flex: 1, padding: "10px 14px", textAlign: "center" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f87171" }}>{wrong}</div>
                <div style={{ fontSize: "0.65rem", color: "hsl(0 0% 40%)" }}>Nicht gewusst</div>
              </div>
              <div className="wd-card" style={{ flex: 1, padding: "10px 14px", textAlign: "center" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "hsl(0 0% 75%)" }}>{filtered.length - correct - wrong}</div>
                <div style={{ fontSize: "0.65rem", color: "hsl(0 0% 40%)" }}>Offen</div>
              </div>
            </div>
          )}

          {/* Mode buttons — only in idle */}
          {mode === "idle" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              <button
                onClick={startStudy}
                disabled={filtered.length === 0}
                style={{
                  padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(74,222,128,0.3)",
                  background: "rgba(74,222,128,0.08)", color: "#4ade80", fontSize: "0.82rem",
                  fontWeight: 600, cursor: "pointer", letterSpacing: "-0.01em",
                }}
              >
                📚 Karten lernen ({filtered.length})
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={startMCQuiz}
                  disabled={filtered.length < 2}
                  style={{
                    flex: 1, padding: "12px 10px", borderRadius: 12, border: "1px solid hsl(0 0% 18%)",
                    background: "hsl(0 0% 8%)", color: "hsl(0 0% 70%)", fontSize: "0.78rem",
                    fontWeight: 600, cursor: "pointer",
                  }}
                >
                  🎯 Multiple Choice
                </button>
                <button
                  onClick={startInputQuiz}
                  disabled={filtered.length === 0}
                  style={{
                    flex: 1, padding: "12px 10px", borderRadius: 12, border: "1px solid hsl(0 0% 18%)",
                    background: "hsl(0 0% 8%)", color: "hsl(0 0% 70%)", fontSize: "0.78rem",
                    fontWeight: 600, cursor: "pointer",
                  }}
                >
                  ✍️ Freitext
                </button>
              </div>
            </div>
          )}

          {/* ── STUDY MODE ──────────────────────────────────────────────── */}
          {mode === "studying" && filtered.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: "0.7rem", color: "hsl(0 0% 40%)" }}>
                  Karte {studyIndex + 1} / {filtered.length}
                </span>
                <button
                  onClick={() => setMode("idle")}
                  style={{ background: "none", border: "none", color: "hsl(0 0% 40%)", cursor: "pointer", fontSize: "0.72rem" }}
                >
                  ✕ Beenden
                </button>
              </div>

              {/* Progress bar */}
              <div style={{ height: 3, borderRadius: 99, background: "hsl(0 0% 12%)", marginBottom: 20 }}>
                <div style={{
                  height: "100%", borderRadius: 99, background: "#4ade80",
                  width: `${((studyIndex) / filtered.length) * 100}%`,
                  transition: "width 0.3s ease",
                }} />
              </div>

              {/* Card */}
              <div
                onClick={() => setFlipped(f => !f)}
                style={{
                  background: "hsl(0 0% 7%)",
                  border: `1px solid ${flipped ? "rgba(74,222,128,0.3)" : "hsl(0 0% 15%)"}`,
                  borderRadius: 18,
                  padding: "32px 20px",
                  textAlign: "center",
                  minHeight: 180,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                  transition: "border-color 0.2s",
                  userSelect: "none",
                }}
              >
                {!flipped ? (
                  <>
                    <div style={{ fontSize: "0.62rem", color: "hsl(0 0% 30%)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      FRAGE
                    </div>
                    <div style={{ fontSize: "0.95rem", color: "hsl(0 0% 88%)", fontWeight: 600, lineHeight: 1.4 }}>
                      {filtered[studyIndex].question}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "hsl(0 0% 30%)", marginTop: 8 }}>
                      Tippe um Antwort zu sehen
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "0.62rem", color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      ANTWORT
                    </div>
                    <div style={{ fontSize: "0.88rem", color: "hsl(0 0% 82%)", lineHeight: 1.5 }}>
                      {filtered[studyIndex].answer}
                    </div>
                  </>
                )}
              </div>

              {flipped && (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => markCard("wrong")}
                    style={{
                      flex: 1, padding: "14px", borderRadius: 12,
                      border: "1px solid rgba(248,113,113,0.3)",
                      background: "rgba(248,113,113,0.08)",
                      color: "#f87171", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    ✕ Nochmal
                  </button>
                  <button
                    onClick={() => markCard("correct")}
                    style={{
                      flex: 1, padding: "14px", borderRadius: 12,
                      border: "1px solid rgba(74,222,128,0.3)",
                      background: "rgba(74,222,128,0.08)",
                      color: "#4ade80", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    ✓ Gewusst
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── MULTIPLE CHOICE ─────────────────────────────────────────── */}
          {mode === "quiz-mc" && !quizDone && filtered.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: "0.7rem", color: "hsl(0 0% 40%)" }}>
                  Frage {quizIndex + 1} / {filtered.length} · {quizScore} ✓
                </span>
                <button
                  onClick={() => setMode("idle")}
                  style={{ background: "none", border: "none", color: "hsl(0 0% 40%)", cursor: "pointer", fontSize: "0.72rem" }}
                >
                  ✕ Beenden
                </button>
              </div>

              <div style={{ height: 3, borderRadius: 99, background: "hsl(0 0% 12%)", marginBottom: 20 }}>
                <div style={{
                  height: "100%", borderRadius: 99, background: "#4ade80",
                  width: `${((quizIndex) / filtered.length) * 100}%`,
                  transition: "width 0.3s ease",
                }} />
              </div>

              <div className="wd-card" style={{ padding: "20px 16px", marginBottom: 16, textAlign: "center" }}>
                <div style={{ fontSize: "0.62rem", color: "hsl(0 0% 35%)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                  FRAGE
                </div>
                <div style={{ fontSize: "0.9rem", color: "hsl(0 0% 88%)", fontWeight: 600, lineHeight: 1.4 }}>
                  {filtered[quizIndex].question}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {mcOptions.map((opt, i) => {
                  let bg = "hsl(0 0% 7%)";
                  let border = "hsl(0 0% 15%)";
                  let color = "hsl(0 0% 72%)";
                  if (mcSelected !== null) {
                    if (opt === filtered[quizIndex].answer) {
                      bg = "rgba(74,222,128,0.1)";
                      border = "rgba(74,222,128,0.4)";
                      color = "#4ade80";
                    } else if (opt === mcSelected && !mcCorrect) {
                      bg = "rgba(248,113,113,0.1)";
                      border = "rgba(248,113,113,0.4)";
                      color = "#f87171";
                    }
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => handleMCSelect(opt)}
                      style={{
                        padding: "14px 16px", borderRadius: 12, border: `1px solid ${border}`,
                        background: bg, color, fontSize: "0.8rem", textAlign: "left",
                        cursor: mcSelected ? "default" : "pointer", lineHeight: 1.4,
                        transition: "all 0.15s",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      {truncate(opt, 120)}
                    </button>
                  );
                })}
              </div>

              {mcSelected !== null && (
                <button
                  onClick={nextMC}
                  style={{
                    width: "100%", padding: "14px", borderRadius: 12,
                    border: "1px solid rgba(74,222,128,0.3)",
                    background: "rgba(74,222,128,0.08)",
                    color: "#4ade80", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  {quizIndex < filtered.length - 1 ? "Weiter →" : "Ergebnis anzeigen"}
                </button>
              )}
            </div>
          )}

          {/* ── FREITEXT QUIZ ────────────────────────────────────────────── */}
          {mode === "quiz-input" && !quizDone && filtered.length > 0 && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: "0.7rem", color: "hsl(0 0% 40%)" }}>
                  Frage {quizIndex + 1} / {filtered.length} · {inputScore} ✓
                </span>
                <button
                  onClick={() => setMode("idle")}
                  style={{ background: "none", border: "none", color: "hsl(0 0% 40%)", cursor: "pointer", fontSize: "0.72rem" }}
                >
                  ✕ Beenden
                </button>
              </div>

              <div style={{ height: 3, borderRadius: 99, background: "hsl(0 0% 12%)", marginBottom: 20 }}>
                <div style={{
                  height: "100%", borderRadius: 99, background: "#4ade80",
                  width: `${((quizIndex) / filtered.length) * 100}%`,
                  transition: "width 0.3s ease",
                }} />
              </div>

              <div className="wd-card" style={{ padding: "20px 16px", marginBottom: 16, textAlign: "center" }}>
                <div style={{ fontSize: "0.62rem", color: "hsl(0 0% 35%)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                  FRAGE
                </div>
                <div style={{ fontSize: "0.9rem", color: "hsl(0 0% 88%)", fontWeight: 600, lineHeight: 1.4 }}>
                  {filtered[quizIndex].question}
                </div>
              </div>

              <textarea
                value={inputAnswer}
                onChange={e => setInputAnswer(e.target.value)}
                disabled={inputResult !== null}
                placeholder="Deine Antwort …"
                rows={3}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "hsl(0 0% 7%)", border: "1px solid hsl(0 0% 16%)",
                  borderRadius: 12, padding: "12px 14px",
                  color: "hsl(0 0% 85%)", fontSize: "0.82rem",
                  resize: "none", outline: "none", marginBottom: 10,
                  fontFamily: "inherit",
                }}
              />

              {inputResult === null ? (
                <button
                  onClick={checkInput}
                  disabled={!inputAnswer.trim()}
                  style={{
                    width: "100%", padding: "13px", borderRadius: 12,
                    border: "1px solid rgba(74,222,128,0.3)",
                    background: "rgba(74,222,128,0.08)",
                    color: "#4ade80", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Prüfen
                </button>
              ) : (
                <div>
                  <div style={{
                    padding: "12px 14px", borderRadius: 12, marginBottom: 10,
                    background: inputResult ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
                    border: `1px solid ${inputResult ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}`,
                    color: inputResult ? "#4ade80" : "#f87171",
                    fontSize: "0.78rem", lineHeight: 1.5,
                  }}>
                    {inputResult ? "✓ Richtig!" : "✕ Nicht ganz."}
                    {!inputResult && (
                      <div style={{ color: "hsl(0 0% 65%)", marginTop: 6, fontSize: "0.75rem" }}>
                        Musterlösung: {filtered[quizIndex].answer}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={nextInput}
                    style={{
                      width: "100%", padding: "13px", borderRadius: 12,
                      border: "1px solid rgba(74,222,128,0.3)",
                      background: "rgba(74,222,128,0.08)",
                      color: "#4ade80", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    {quizIndex < filtered.length - 1 ? "Weiter →" : "Ergebnis anzeigen"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── QUIZ DONE ────────────────────────────────────────────────── */}
          {(mode === "quiz-mc" || mode === "quiz-input") && quizDone && (
            <div className="wd-card" style={{ padding: "32px 20px", textAlign: "center" }}>
              <div style={{ fontSize: "2.4rem", marginBottom: 12 }}>🏆</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#4ade80", marginBottom: 4 }}>
                {mode === "quiz-mc" ? quizScore : inputScore} / {filtered.length}
              </div>
              <div style={{ fontSize: "0.8rem", color: "hsl(0 0% 50%)", marginBottom: 24 }}>
                {(() => {
                  const score = mode === "quiz-mc" ? quizScore : inputScore;
                  const pct = score / filtered.length;
                  if (pct >= 0.9) return "Ausgezeichnet! 🎉";
                  if (pct >= 0.7) return "Gut gemacht!";
                  if (pct >= 0.5) return "Noch ein bisschen üben!";
                  return "Weitermachen — du schaffst das!";
                })()}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <button
                  onClick={() => { mode === "quiz-mc" ? startMCQuiz() : startInputQuiz(); }}
                  style={{
                    padding: "11px 20px", borderRadius: 12,
                    border: "1px solid rgba(74,222,128,0.3)",
                    background: "rgba(74,222,128,0.08)",
                    color: "#4ade80", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Nochmal
                </button>
                <button
                  onClick={() => setMode("idle")}
                  style={{
                    padding: "11px 20px", borderRadius: 12,
                    border: "1px solid hsl(0 0% 16%)",
                    background: "hsl(0 0% 8%)",
                    color: "hsl(0 0% 60%)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Zurück
                </button>
              </div>
            </div>
          )}

          {/* ── CARD LIST PREVIEW (idle) ─────────────────────────────────── */}
          {mode === "idle" && (
            <div>
              <div style={{ fontSize: "0.68rem", color: "hsl(0 0% 32%)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Karten ({filtered.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {filtered.map(card => (
                  <div
                    key={card.id}
                    className="wd-card"
                    style={{
                      padding: "12px 14px",
                      borderLeft: `2px solid ${
                        statuses[card.id] === "correct" ? "#4ade80" :
                        statuses[card.id] === "wrong" ? "#f87171" :
                        "hsl(0 0% 16%)"
                      }`,
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", color: "hsl(0 0% 78%)", fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>
                      {card.question}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "hsl(0 0% 42%)", lineHeight: 1.4 }}>
                      {truncate(card.answer, 100)}
                    </div>
                    {card.topic && (
                      <div style={{
                        display: "inline-block", marginTop: 6,
                        fontSize: "0.6rem", color: "hsl(0 0% 35%)",
                        background: "hsl(0 0% 10%)", borderRadius: 99, padding: "2px 8px",
                      }}>
                        {card.topic}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
