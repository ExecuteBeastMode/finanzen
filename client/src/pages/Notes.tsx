import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type Note = {
  id: number;
  title: string;
  content: string;
  pinned: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
};

const NOTE_COLORS: Record<string, { bg: string; border: string; dot: string }> = {
  default: { bg: "hsl(0 0% 7%)",               border: "hsl(0 0% 12%)",            dot: "hsl(0 0% 35%)" },
  green:   { bg: "rgba(74,222,128,0.04)",       border: "rgba(74,222,128,0.18)",    dot: "#4ade80" },
  yellow:  { bg: "rgba(251,191,36,0.04)",       border: "rgba(251,191,36,0.18)",    dot: "#fbbf24" },
  red:     { bg: "rgba(248,113,113,0.04)",      border: "rgba(248,113,113,0.18)",   dot: "#f87171" },
  blue:    { bg: "rgba(96,165,250,0.04)",       border: "rgba(96,165,250,0.18)",    dot: "#60a5fa" },
  purple:  { bg: "rgba(167,139,250,0.04)",      border: "rgba(167,139,250,0.18)",   dot: "#a78bfa" },
};

const COLOR_NAMES = Object.keys(NOTE_COLORS);

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.floor(h / 24);
  if (d < 7) return `vor ${d} Tagen`;
  return new Date(iso).toLocaleDateString("de-DE");
}

export default function NotesPage() {
  const { toast } = useToast();
  const { data: notes = [] } = useQuery<Note[]>({ queryKey: ["/api/notes"] });
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editColor, setEditColor] = useState("default");
  const titleRef = useRef<HTMLInputElement>(null);

  const addMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/notes", {
      title: "Neue Notiz",
      content: "",
      pinned: false,
      color: "default",
    }).then(r => r.json()),
    onSuccess: (note) => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      openEdit(note);
    }
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/notes/${id}`, data).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notes"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/notes/${id}`).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setEditingId(null);
      toast({ title: "Notiz gelöscht" });
    }
  });

  const pinMut = useMutation({
    mutationFn: ({ id, pinned }: { id: number; pinned: boolean }) =>
      apiRequest("PATCH", `/api/notes/${id}`, { pinned }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notes"] }),
  });

  function openEdit(note: Note) {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditColor(note.color);
    setTimeout(() => titleRef.current?.focus(), 50);
  }

  function saveEdit() {
    if (editingId === null) return;
    updateMut.mutate({ id: editingId, data: { title: editTitle || "Neue Notiz", content: editContent, color: editColor } });
  }

  // Auto-save on change
  useEffect(() => {
    if (editingId === null) return;
    const t = setTimeout(() => saveEdit(), 600);
    return () => clearTimeout(t);
  }, [editTitle, editContent, editColor]);

  const filtered = notes
    .filter(n => {
      if (!search) return true;
      return n.title.toLowerCase().includes(search.toLowerCase()) ||
             n.content.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const pinned = filtered.filter(n => n.pinned);
  const unpinned = filtered.filter(n => !n.pinned);

  const editingNote = notes.find(n => n.id === editingId);

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>

      {/* ── Sidebar list ─────────────────────────────────────────────── */}
      <div style={{
        width: editingId ? 280 : "100%",
        maxWidth: editingId ? 280 : undefined,
        flexShrink: 0,
        borderRight: editingId ? "1px solid hsl(0 0% 11%)" : "none",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 16px 12px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h1 className="page-heading">Notizen</h1>
            <button className="btn-cyan" style={{ padding: "6px 12px", fontSize: "0.78rem" }} onClick={() => addMut.mutate()}>
              + Neu
            </button>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Suchen..."
            style={{ fontSize: "0.82rem" }}
          />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 10px 16px" }}>
          {notes.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 16px", color: "hsl(0 0% 30%)", fontSize: "0.82rem" }}>
              <div style={{ fontSize: "2rem", marginBottom: 10 }}>📝</div>
              Noch keine Notizen.<br />Klick auf "+ Neu" um loszulegen.
            </div>
          )}

          {pinned.length > 0 && (
            <>
              <div className="section-title" style={{ padding: "8px 6px 6px" }}>Angepinnt</div>
              {pinned.map(note => <NoteCard key={note.id} note={note} active={editingId === note.id} onClick={() => openEdit(note)} onPin={() => pinMut.mutate({ id: note.id, pinned: !note.pinned })} />)}
            </>
          )}

          {unpinned.length > 0 && (
            <>
              {pinned.length > 0 && <div className="section-title" style={{ padding: "12px 6px 6px" }}>Notizen</div>}
              {unpinned.map(note => <NoteCard key={note.id} note={note} active={editingId === note.id} onClick={() => openEdit(note)} onPin={() => pinMut.mutate({ id: note.id, pinned: !note.pinned })} />)}
            </>
          )}

          {filtered.length === 0 && notes.length > 0 && (
            <div style={{ textAlign: "center", padding: "30px 0", color: "hsl(0 0% 30%)", fontSize: "0.82rem" }}>
              Keine Ergebnisse für "{search}"
            </div>
          )}
        </div>
      </div>

      {/* ── Editor ────────────────────────────────────────────────────── */}
      {editingId !== null && editingNote && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Toolbar */}
          <div style={{ padding: "12px 20px", borderBottom: "1px solid hsl(0 0% 11%)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {/* Color picker */}
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              {COLOR_NAMES.map(c => (
                <button
                  key={c}
                  onClick={() => setEditColor(c)}
                  style={{
                    width: 14, height: 14, borderRadius: "50%",
                    background: NOTE_COLORS[c].dot,
                    border: editColor === c ? "2px solid hsl(0 0% 75%)" : "2px solid transparent",
                    cursor: "pointer", flexShrink: 0, transition: "border 0.1s",
                  }}
                  title={c}
                />
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: "0.66rem", color: "hsl(0 0% 28%)" }}>
              {timeAgo(editingNote.updatedAt)} gespeichert
            </span>
            <button
              onClick={() => pinMut.mutate({ id: editingId, pinned: !editingNote.pinned })}
              style={{ fontSize: "0.72rem", color: editingNote.pinned ? "#fbbf24" : "hsl(0 0% 35%)", background: "none", border: "none", cursor: "pointer" }}
              title="Anpinnen"
            >
              📌
            </button>
            <button
              className="btn-danger"
              style={{ padding: "4px 10px", fontSize: "0.7rem" }}
              onClick={() => { if (confirm("Notiz löschen?")) deleteMut.mutate(editingId); }}
            >
              Löschen
            </button>
            <button
              style={{ fontSize: "1rem", color: "hsl(0 0% 35%)", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}
              onClick={() => { saveEdit(); setEditingId(null); }}
              title="Schließen"
            >
              ✕
            </button>
          </div>

          {/* Title */}
          <div style={{ padding: "20px 24px 0" }}>
            <input
              ref={titleRef}
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="Titel..."
              style={{
                background: "transparent",
                border: "none",
                borderRadius: 0,
                fontSize: "1.3rem",
                fontWeight: 600,
                color: "hsl(0 0% 92%)",
                letterSpacing: "-0.02em",
                padding: "0",
                width: "100%",
                boxShadow: "none",
              }}
            />
          </div>

          {/* Content */}
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            placeholder="Notiz schreiben..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              borderRadius: 0,
              resize: "none",
              padding: "12px 24px 24px",
              fontSize: "0.9rem",
              lineHeight: 1.75,
              color: "hsl(0 0% 72%)",
              boxShadow: "none",
              minHeight: 0,
            }}
          />
        </div>
      )}
    </div>
  );
}

function NoteCard({ note, active, onClick, onPin }: {
  note: Note; active: boolean; onClick: () => void; onPin: () => void;
}) {
  const c = NOTE_COLORS[note.color] ?? NOTE_COLORS.default;
  const preview = note.content.slice(0, 80).replace(/\n/g, " ");

  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 12px",
        borderRadius: 9,
        marginBottom: 4,
        cursor: "pointer",
        background: active ? "hsl(0 0% 11%)" : c.bg,
        border: `1px solid ${active ? "hsl(0 0% 17%)" : c.border}`,
        transition: "background 0.1s, border-color 0.1s",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "hsl(0 0% 85%)", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {note.title || "Neue Notiz"}
          </div>
          {preview && (
            <div style={{ fontSize: "0.72rem", color: "hsl(0 0% 36%)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {preview}
            </div>
          )}
          <div style={{ fontSize: "0.62rem", color: "hsl(0 0% 28%)", marginTop: 5 }}>
            {timeAgo(note.updatedAt)}
          </div>
        </div>
        {note.pinned && (
          <span style={{ fontSize: "0.7rem", flexShrink: 0 }}>📌</span>
        )}
      </div>
      {/* Color dot */}
      {note.color !== "default" && (
        <div style={{ position: "absolute", top: 10, right: note.pinned ? 26 : 10, width: 6, height: 6, borderRadius: "50%", background: c.dot }} />
      )}
    </div>
  );
}
