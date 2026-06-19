import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TiktokPost } from "@shared/schema";

const STATUSES = ["idea", "filming", "editing", "posted"] as const;
const STATUS_LABELS: Record<string, string> = { idea: "Idee", filming: "Aufnahme", editing: "Schnitt", posted: "Gepostet" };
const STATUS_COLORS: Record<string, string> = { idea: "#9ca3af", filming: "#fbbf24", editing: "#a78bfa", posted: "#4ade80" };

const IDEA_TYPES = ["video", "reel", "story", "collab", "trend"] as const;
const IDEA_TYPE_LABELS: Record<string, string> = { video: "Video", reel: "Reel", story: "Story", collab: "Collab", trend: "Trend" };
const IDEA_PRIORITIES = ["low", "medium", "high"] as const;
const PRIORITY_COLORS: Record<string, string> = { low: "#9ca3af", medium: "#fbbf24", high: "#f87171" };
const PRIORITY_LABELS: Record<string, string> = { low: "Niedrig", medium: "Mittel", high: "Hoch" };

type ContentIdea = {
  id: number;
  title: string;
  description?: string | null;
  type: string;
  platform: string;
  priority: string;
  tags: string;
  used: boolean;
  createdAt: string;
};

export default function TikTokPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"planer" | "ideen" | "stats">("planer");

  // ── Follower count ─────────────────────────────────────────────────
  const { data: followerSetting } = useQuery<any>({
    queryKey: ["/api/settings/tiktok_followers"],
    queryFn: () => apiRequest("GET", "/api/settings/tiktok_followers").then(r => r.json()),
  });
  const followerCount = followerSetting?.value ? parseInt(followerSetting.value, 10) : null;
  const [editingFollowers, setEditingFollowers] = useState(false);
  const [followerInput, setFollowerInput] = useState("");

  const saveFollowersMut = useMutation({
    mutationFn: (val: string) => apiRequest("POST", "/api/settings", { key: "tiktok_followers", value: val }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/settings/tiktok_followers"] }); setEditingFollowers(false); toast({ title: "Follower aktualisiert" }); }
  });

  // ── TikTok posts ───────────────────────────────────────────────────
  const { data: posts = [] } = useQuery<TiktokPost[]>({ queryKey: ["/api/tiktok"] });
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showPostForm, setShowPostForm] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [postForm, setPostForm] = useState({ title: "", hook: "", concept: "", status: "idea", scheduledDate: "", tags: "", niche: "calisthenics" });

  const addPostMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tiktok", data).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/tiktok"] }); setShowPostForm(false); resetPostForm(); toast({ title: "Post hinzugefügt" }); }
  });
  const updatePostMut = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PATCH", `/api/tiktok/${id}`, data).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/tiktok"] }); setEditingPostId(null); resetPostForm(); toast({ title: "Post aktualisiert" }); }
  });
  const deletePostMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/tiktok/${id}`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tiktok"] })
  });
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => apiRequest("PATCH", `/api/tiktok/${id}`, { status }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tiktok"] })
  });

  const resetPostForm = () => setPostForm({ title: "", hook: "", concept: "", status: "idea", scheduledDate: "", tags: "", niche: "calisthenics" });

  const filteredPosts = posts.filter(p => filterStatus === "all" || p.status === filterStatus);
  const postStats = {
    total: posts.length,
    idea: posts.filter(p => p.status === "idea").length,
    filming: posts.filter(p => p.status === "filming").length,
    editing: posts.filter(p => p.status === "editing").length,
    posted: posts.filter(p => p.status === "posted").length,
  };

  const handlePostSubmit = () => {
    if (!postForm.title) return;
    const data = { ...postForm, tags: JSON.stringify(postForm.tags.split(",").map(t => t.trim()).filter(Boolean)), scheduledDate: postForm.scheduledDate || null };
    if (editingPostId) { updatePostMut.mutate({ id: editingPostId, data }); } else { addPostMut.mutate(data); }
  };

  const startEditPost = (p: TiktokPost) => {
    setPostForm({ title: p.title, hook: p.hook || "", concept: p.concept || "", status: p.status, scheduledDate: p.scheduledDate || "", tags: (JSON.parse(p.tags || "[]")).join(", "), niche: p.niche });
    setEditingPostId(p.id);
    setShowPostForm(true);
  };

  // ── Content Ideas ──────────────────────────────────────────────────
  const { data: contentIdeas = [] } = useQuery<ContentIdea[]>({ queryKey: ["/api/content-ideas"] });
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [editingIdeaId, setEditingIdeaId] = useState<number | null>(null);
  const [ideaFilterPriority, setIdeaFilterPriority] = useState<string>("all");
  const [ideaFilterType, setIdeaFilterType] = useState<string>("all");
  const [ideaFilterUsed, setIdeaFilterUsed] = useState<"all" | "unused" | "used">("unused");
  const [ideaForm, setIdeaForm] = useState({ title: "", description: "", type: "video", priority: "medium", tags: "" });

  const addIdeaMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/content-ideas", data).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/content-ideas"] }); setShowIdeaForm(false); resetIdeaForm(); toast({ title: "Idee gespeichert ✓" }); }
  });
  const updateIdeaMut = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PATCH", `/api/content-ideas/${id}`, data).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/content-ideas"] }); setEditingIdeaId(null); setShowIdeaForm(false); resetIdeaForm(); }
  });
  const deleteIdeaMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/content-ideas/${id}`).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/content-ideas"] })
  });
  const toggleUsedMut = useMutation({
    mutationFn: ({ id, used }: { id: number; used: boolean }) => apiRequest("PATCH", `/api/content-ideas/${id}`, { used }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/content-ideas"] })
  });

  const resetIdeaForm = () => setIdeaForm({ title: "", description: "", type: "video", priority: "medium", tags: "" });

  const filteredIdeas = contentIdeas.filter(i => {
    if (ideaFilterPriority !== "all" && i.priority !== ideaFilterPriority) return false;
    if (ideaFilterType !== "all" && i.type !== ideaFilterType) return false;
    if (ideaFilterUsed === "unused") return !i.used;
    if (ideaFilterUsed === "used") return i.used;
    return true;
  });

  const startEditIdea = (idea: ContentIdea) => {
    const tags = JSON.parse(idea.tags || "[]") as string[];
    setIdeaForm({ title: idea.title, description: idea.description || "", type: idea.type, priority: idea.priority, tags: tags.join(", ") });
    setEditingIdeaId(idea.id);
    setShowIdeaForm(true);
  };

  const handleIdeaSubmit = () => {
    if (!ideaForm.title) return;
    const data = { ...ideaForm, tags: JSON.stringify(ideaForm.tags.split(",").map(t => t.trim()).filter(Boolean)), platform: "tiktok" };
    if (editingIdeaId) { updateIdeaMut.mutate({ id: editingIdeaId, data }); } else { addIdeaMut.mutate(data); }
  };

  const TAB_STYLE = (active: boolean) => ({
    padding: "6px 16px", fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" as const,
    fontFamily: "inherit", cursor: "pointer", border: "1px solid",
    borderColor: active ? "rgba(74,222,128,0.4)" : "hsl(0 0% 15%)",
    background: active ? "rgba(74,222,128,0.1)" : "transparent",
    color: active ? "#4ade80" : "hsl(0 0% 45%)",
    borderRadius: 5, transition: "all 0.15s"
  });

  return (
    <div style={{ padding: "24px 28px", maxWidth: 940 }}>

      {/* Header with follower count */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "1.1rem", fontWeight: 600, color: "hsl(0 0% 88%)", marginBottom: 4 }}>TikTok</h1>
          <a href="https://www.tiktok.com/@execute_beast.mode" target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: "hsl(0 0% 38%)", textDecoration: "none" }}>@execute_beast.mode</a>
        </div>

        {/* Follower widget */}
        <div className="wd-card" style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, minWidth: 160 }}>
          <div>
            <div style={{ fontSize: "0.6rem", color: "hsl(0 0% 35%)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>Follower</div>
            {editingFollowers ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  type="number"
                  value={followerInput}
                  onChange={e => setFollowerInput(e.target.value)}
                  placeholder="z.B. 312"
                  style={{ width: 90, padding: "3px 6px", fontSize: "0.8rem" }}
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter") saveFollowersMut.mutate(followerInput); if (e.key === "Escape") setEditingFollowers(false); }}
                />
                <button className="btn-cyan" style={{ padding: "3px 8px", fontSize: "0.65rem" }} onClick={() => saveFollowersMut.mutate(followerInput)}>✓</button>
                <button className="btn-danger" style={{ padding: "3px 6px", fontSize: "0.65rem" }} onClick={() => setEditingFollowers(false)}>✕</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="mono" style={{ fontSize: "1.2rem", fontWeight: 700, color: "#4ade80" }}>
                  {followerCount !== null ? followerCount.toLocaleString("de-DE") : "—"}
                </span>
                <button onClick={() => { setFollowerInput(followerCount?.toString() ?? ""); setEditingFollowers(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(0 0% 35%)", fontSize: "0.75rem", padding: 2 }}>✎</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        <button style={TAB_STYLE(activeTab === "planer")} onClick={() => setActiveTab("planer")}>Planer</button>
        <button style={TAB_STYLE(activeTab === "ideen")} onClick={() => setActiveTab("ideen")}>Ideen Sheet</button>
        <button style={TAB_STYLE(activeTab === "stats")} onClick={() => setActiveTab("stats")}>Stats</button>
      </div>

      {/* ──────────── TAB: PLANER ──────────── */}
      {activeTab === "planer" && (
        <div>
          {/* Stat cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
            {STATUSES.map(s => (
              <div key={s} className="wd-card" style={{ padding: "10px 14px", cursor: "pointer", borderColor: filterStatus === s ? STATUS_COLORS[s] + "55" : undefined }}
                onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}>
                <div style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "hsl(0 0% 35%)", marginBottom: 3 }}>{STATUS_LABELS[s]}</div>
                <div className="mono" style={{ fontSize: "1.3rem", fontWeight: 700, color: STATUS_COLORS[s] }}>{postStats[s]}</div>
              </div>
            ))}
          </div>

          {/* Add post button */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            <button className="btn-cyan" onClick={() => { setShowPostForm(true); setEditingPostId(null); resetPostForm(); }}>+ Neuer Post</button>
          </div>

          {/* Post form */}
          {showPostForm && (
            <div className="wd-card" style={{ padding: 20, marginBottom: 20, borderColor: "rgba(74,222,128,0.2)" }}>
              <div className="section-title" style={{ marginBottom: 14 }}>{editingPostId ? "Post bearbeiten" : "Neuer Post"}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: "0.65rem", color: "hsl(0 0% 35%)", display: "block", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Titel *</label>
                    <input value={postForm.title} onChange={e => setPostForm(f => ({ ...f, title: e.target.value }))} placeholder="Post-Titel" />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.65rem", color: "hsl(0 0% 35%)", display: "block", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Status</label>
                    <select value={postForm.status} onChange={e => setPostForm(f => ({ ...f, status: e.target.value }))}>
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "0.65rem", color: "hsl(0 0% 35%)", display: "block", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Hook</label>
                  <input value={postForm.hook} onChange={e => setPostForm(f => ({ ...f, hook: e.target.value }))} placeholder="Was macht die Zuschauer neugierig?" />
                </div>
                <div>
                  <label style={{ fontSize: "0.65rem", color: "hsl(0 0% 35%)", display: "block", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Konzept</label>
                  <textarea value={postForm.concept} onChange={e => setPostForm(f => ({ ...f, concept: e.target.value }))} placeholder="Beschreibe den Inhalt des Videos..." rows={3} style={{ resize: "vertical" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: "0.65rem", color: "hsl(0 0% 35%)", display: "block", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Geplantes Datum</label>
                    <input type="date" value={postForm.scheduledDate} onChange={e => setPostForm(f => ({ ...f, scheduledDate: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.65rem", color: "hsl(0 0% 35%)", display: "block", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Nische</label>
                    <input value={postForm.niche} onChange={e => setPostForm(f => ({ ...f, niche: e.target.value }))} placeholder="calisthenics" />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.65rem", color: "hsl(0 0% 35%)", display: "block", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Tags</label>
                    <input value={postForm.tags} onChange={e => setPostForm(f => ({ ...f, tags: e.target.value }))} placeholder="handstand, tutorial, gym" />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="btn-danger" onClick={() => { setShowPostForm(false); setEditingPostId(null); resetPostForm(); }}>Abbrechen</button>
                  <button className="btn-cyan" onClick={handlePostSubmit}>{editingPostId ? "Speichern" : "Erstellen"}</button>
                </div>
              </div>
            </div>
          )}

          {/* Filter bar */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            <button onClick={() => setFilterStatus("all")} style={{ padding: "4px 12px", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "inherit", cursor: "pointer", border: "1px solid", borderColor: filterStatus === "all" ? "rgba(74,222,128,0.4)" : "hsl(0 0% 15%)", background: filterStatus === "all" ? "rgba(74,222,128,0.1)" : "transparent", color: filterStatus === "all" ? "#4ade80" : "hsl(0 0% 45%)", borderRadius: 4 }}>Alle ({postStats.total})</button>
            {STATUSES.map(s => (
              <button key={s} onClick={() => setFilterStatus(filterStatus === s ? "all" : s)} style={{ padding: "4px 12px", fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "inherit", cursor: "pointer", border: "1px solid", borderColor: filterStatus === s ? STATUS_COLORS[s] + "55" : "hsl(0 0% 15%)", background: filterStatus === s ? STATUS_COLORS[s] + "18" : "transparent", color: filterStatus === s ? STATUS_COLORS[s] : "hsl(0 0% 45%)", borderRadius: 4 }}>
                {STATUS_LABELS[s]} ({postStats[s]})
              </button>
            ))}
          </div>

          {/* Posts list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredPosts.map(p => {
              const tags = JSON.parse(p.tags || "[]") as string[];
              return (
                <div key={p.id} className="wd-card" style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "hsl(0 0% 88%)" }}>{p.title}</span>
                        <span style={{ fontSize: "0.62rem", padding: "1px 7px", borderRadius: 3, background: STATUS_COLORS[p.status] + "20", color: STATUS_COLORS[p.status], border: `1px solid ${STATUS_COLORS[p.status]}40` }}>{STATUS_LABELS[p.status]}</span>
                      </div>
                      {p.hook && <div style={{ fontSize: "0.78rem", color: "#fbbf24", marginBottom: 4, fontStyle: "italic" }}>"{p.hook}"</div>}
                      {p.concept && <div style={{ fontSize: "0.75rem", color: "hsl(0 0% 45%)", marginBottom: 6, lineHeight: 1.4 }}>{p.concept}</div>}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        {p.scheduledDate && <span style={{ fontSize: "0.68rem", color: "hsl(0 0% 40%)" }}>📅 {new Date(p.scheduledDate).toLocaleDateString("de-DE")}</span>}
                        {p.niche && <span style={{ fontSize: "0.62rem", padding: "1px 7px", borderRadius: 3, background: "hsl(0 0% 12%)", color: "hsl(0 0% 45%)", border: "1px solid hsl(0 0% 17%)" }}>{p.niche}</span>}
                        {tags.map((t, i) => <span key={i} style={{ fontSize: "0.62rem", padding: "1px 6px", borderRadius: 3, background: "rgba(167,139,250,0.08)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)" }}>#{t}</span>)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                      <select value={p.status} onChange={e => statusMut.mutate({ id: p.id, status: e.target.value })} style={{ width: 100, fontSize: "0.68rem", padding: "3px 6px", background: STATUS_COLORS[p.status] + "18", color: STATUS_COLORS[p.status], borderColor: STATUS_COLORS[p.status] + "40" }}>
                        {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                      <button className="btn-cyan" style={{ padding: "4px 8px", fontSize: "0.65rem" }} onClick={() => startEditPost(p)}>✎</button>
                      <button className="btn-danger" style={{ padding: "4px 8px", fontSize: "0.65rem" }} onClick={() => deletePostMut.mutate(p.id)}>✕</button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredPosts.length === 0 && <div className="wd-card" style={{ padding: 20, textAlign: "center", color: "hsl(0 0% 35%)", fontSize: "0.85rem" }}>Keine Posts in dieser Kategorie</div>}
          </div>
        </div>
      )}

      {/* ──────────── TAB: IDEEN SHEET ──────────── */}
      {activeTab === "ideen" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: "0.75rem", color: "hsl(0 0% 38%)" }}>
              {contentIdeas.filter(i => !i.used).length} offene · {contentIdeas.filter(i => i.used).length} verbraucht
            </div>
            <button className="btn-cyan" onClick={() => { setShowIdeaForm(true); setEditingIdeaId(null); resetIdeaForm(); }}>+ Neue Idee</button>
          </div>

          {/* Idea form */}
          {showIdeaForm && (
            <div className="wd-card" style={{ padding: 20, marginBottom: 20, borderColor: "rgba(74,222,128,0.2)" }}>
              <div className="section-title" style={{ marginBottom: 14 }}>{editingIdeaId ? "Idee bearbeiten" : "Neue Content-Idee"}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={{ fontSize: "0.65rem", color: "hsl(0 0% 35%)", display: "block", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Titel *</label>
                  <input value={ideaForm.title} onChange={e => setIdeaForm(f => ({ ...f, title: e.target.value }))} placeholder="Ideen-Titel" />
                </div>
                <div>
                  <label style={{ fontSize: "0.65rem", color: "hsl(0 0% 35%)", display: "block", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Beschreibung</label>
                  <textarea value={ideaForm.description} onChange={e => setIdeaForm(f => ({ ...f, description: e.target.value }))} placeholder="Konzept, Idee, Notizen..." rows={3} style={{ resize: "vertical" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: "0.65rem", color: "hsl(0 0% 35%)", display: "block", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Typ</label>
                    <select value={ideaForm.type} onChange={e => setIdeaForm(f => ({ ...f, type: e.target.value }))}>
                      {IDEA_TYPES.map(t => <option key={t} value={t}>{IDEA_TYPE_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.65rem", color: "hsl(0 0% 35%)", display: "block", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Priorität</label>
                    <select value={ideaForm.priority} onChange={e => setIdeaForm(f => ({ ...f, priority: e.target.value }))}>
                      {IDEA_PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.65rem", color: "hsl(0 0% 35%)", display: "block", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>Tags</label>
                    <input value={ideaForm.tags} onChange={e => setIdeaForm(f => ({ ...f, tags: e.target.value }))} placeholder="handstand, tutorial" />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="btn-danger" onClick={() => { setShowIdeaForm(false); setEditingIdeaId(null); resetIdeaForm(); }}>Abbrechen</button>
                  <button className="btn-cyan" onClick={handleIdeaSubmit}>{editingIdeaId ? "Speichern" : "Hinzufügen"}</button>
                </div>
              </div>
            </div>
          )}

          {/* Idea filters */}
          <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 4 }}>
              {(["all", "unused", "used"] as const).map(f => (
                <button key={f} onClick={() => setIdeaFilterUsed(f)} style={{ padding: "3px 10px", fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", fontFamily: "inherit", cursor: "pointer", border: "1px solid", borderColor: ideaFilterUsed === f ? "rgba(74,222,128,0.4)" : "hsl(0 0% 15%)", background: ideaFilterUsed === f ? "rgba(74,222,128,0.1)" : "transparent", color: ideaFilterUsed === f ? "#4ade80" : "hsl(0 0% 42%)", borderRadius: 4 }}>
                  {f === "all" ? "Alle" : f === "unused" ? "Offen" : "Verbraucht"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setIdeaFilterPriority("all")} style={{ padding: "3px 10px", fontSize: "0.68rem", fontWeight: 600, fontFamily: "inherit", cursor: "pointer", border: "1px solid", borderColor: ideaFilterPriority === "all" ? "hsl(0 0% 35%)" : "hsl(0 0% 13%)", background: ideaFilterPriority === "all" ? "hsl(0 0% 12%)" : "transparent", color: "hsl(0 0% 45%)", borderRadius: 4 }}>Alle</button>
              {IDEA_PRIORITIES.map(p => (
                <button key={p} onClick={() => setIdeaFilterPriority(ideaFilterPriority === p ? "all" : p)} style={{ padding: "3px 10px", fontSize: "0.68rem", fontWeight: 600, fontFamily: "inherit", cursor: "pointer", border: "1px solid", borderColor: ideaFilterPriority === p ? PRIORITY_COLORS[p] + "55" : "hsl(0 0% 13%)", background: ideaFilterPriority === p ? PRIORITY_COLORS[p] + "15" : "transparent", color: ideaFilterPriority === p ? PRIORITY_COLORS[p] : "hsl(0 0% 42%)", borderRadius: 4 }}>
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Ideas list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredIdeas.map(idea => {
              const tags = JSON.parse(idea.tags || "[]") as string[];
              return (
                <div key={idea.id} className="wd-card" style={{ padding: "14px 16px", opacity: idea.used ? 0.55 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "hsl(0 0% 88%)", textDecoration: idea.used ? "line-through" : "none" }}>{idea.title}</span>
                        <span style={{ fontSize: "0.6rem", padding: "1px 6px", borderRadius: 3, background: PRIORITY_COLORS[idea.priority] + "18", color: PRIORITY_COLORS[idea.priority], border: `1px solid ${PRIORITY_COLORS[idea.priority]}40` }}>{PRIORITY_LABELS[idea.priority]}</span>
                        <span style={{ fontSize: "0.6rem", padding: "1px 6px", borderRadius: 3, background: "hsl(0 0% 12%)", color: "hsl(0 0% 45%)", border: "1px solid hsl(0 0% 17%)" }}>{IDEA_TYPE_LABELS[idea.type]}</span>
                      </div>
                      {idea.description && <div style={{ fontSize: "0.76rem", color: "hsl(0 0% 45%)", marginBottom: 6, lineHeight: 1.45 }}>{idea.description}</div>}
                      {tags.length > 0 && (
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {tags.map((t, i) => <span key={i} style={{ fontSize: "0.62rem", padding: "1px 6px", borderRadius: 3, background: "rgba(167,139,250,0.08)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)" }}>#{t}</span>)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 5, flexShrink: 0, alignItems: "center" }}>
                      <button
                        onClick={() => toggleUsedMut.mutate({ id: idea.id, used: !idea.used })}
                        style={{ padding: "4px 10px", fontSize: "0.65rem", fontFamily: "inherit", cursor: "pointer", border: "1px solid", borderRadius: 4, borderColor: idea.used ? "hsl(0 0% 18%)" : "rgba(74,222,128,0.35)", background: idea.used ? "transparent" : "rgba(74,222,128,0.1)", color: idea.used ? "hsl(0 0% 38%)" : "#4ade80" }}
                      >
                        {idea.used ? "Wiederherstellen" : "✓ Verbraucht"}
                      </button>
                      <button className="btn-cyan" style={{ padding: "4px 8px", fontSize: "0.65rem" }} onClick={() => startEditIdea(idea)}>✎</button>
                      <button className="btn-danger" style={{ padding: "4px 8px", fontSize: "0.65rem" }} onClick={() => deleteIdeaMut.mutate(idea.id)}>✕</button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredIdeas.length === 0 && (
              <div className="wd-card" style={{ padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>💡</div>
                <div style={{ color: "hsl(0 0% 35%)", fontSize: "0.85rem" }}>Noch keine Ideen — halte deine Content-Ideen hier fest!</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ──────────── TAB: STATS ──────────── */}
      {activeTab === "stats" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          <div className="wd-card" style={{ padding: "18px 20px" }}>
            <div className="section-title" style={{ marginBottom: 14 }}>Posts nach Status</div>
            {STATUSES.map(s => (
              <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid hsl(0 0% 11%)" }}>
                <span style={{ fontSize: "0.83rem", color: STATUS_COLORS[s] }}>{STATUS_LABELS[s]}</span>
                <span className="mono" style={{ fontSize: "0.83rem", color: "hsl(0 0% 55%)" }}>{postStats[s]}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8 }}>
              <span style={{ fontSize: "0.75rem", color: "hsl(0 0% 40%)" }}>Gesamt</span>
              <span className="mono" style={{ fontSize: "0.83rem", fontWeight: 600, color: "hsl(0 0% 75%)" }}>{postStats.total}</span>
            </div>
          </div>

          <div className="wd-card" style={{ padding: "18px 20px" }}>
            <div className="section-title" style={{ marginBottom: 14 }}>Content Ideen</div>
            {IDEA_TYPES.map(t => {
              const count = contentIdeas.filter(i => i.type === t).length;
              return (
                <div key={t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid hsl(0 0% 11%)" }}>
                  <span style={{ fontSize: "0.83rem", color: "hsl(0 0% 65%)" }}>{IDEA_TYPE_LABELS[t]}</span>
                  <span className="mono" style={{ fontSize: "0.83rem", color: "hsl(0 0% 45%)" }}>{count}</span>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8 }}>
              <span style={{ fontSize: "0.75rem", color: "hsl(0 0% 40%)" }}>Gesamt</span>
              <span className="mono" style={{ fontSize: "0.83rem", fontWeight: 600, color: "hsl(0 0% 75%)" }}>{contentIdeas.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
