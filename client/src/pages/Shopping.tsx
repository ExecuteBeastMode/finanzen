import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ShoppingItem } from "@shared/schema";

const CATEGORIES = [
  { key: "alle", label: "Alle", emoji: "🛒" },
  { key: "obst", label: "Obst & Gemüse", emoji: "🥦" },
  { key: "milch", label: "Milch & Käse", emoji: "🥛" },
  { key: "fleisch", label: "Fleisch", emoji: "🥩" },
  { key: "getränke", label: "Getränke", emoji: "🥤" },
  { key: "haushalt", label: "Haushalt", emoji: "🧹" },
  { key: "sonstiges", label: "Sonstiges", emoji: "📦" },
];

export default function ShoppingPage() {
  const [filter, setFilter] = useState("alle");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("sonstiges");
  const [note, setNote] = useState("");

  const { data: items = [], isLoading } = useQuery<ShoppingItem[]>({
    queryKey: ["/api/shopping"],
  });

  const addMutation = useMutation({
    mutationFn: (item: { name: string; quantity: string; category: string; note: string }) =>
      apiRequest("POST", "/api/shopping", item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shopping"] });
      setName("");
      setQuantity("");
      setNote("");
      setCategory("sonstiges");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, checked }: { id: number; checked: boolean }) =>
      apiRequest("PATCH", `/api/shopping/${id}`, { checked }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/shopping"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/shopping/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/shopping"] }),
  });

  const clearCheckedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/shopping/clear-checked", {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/shopping"] }),
  });

  const handleAdd = () => {
    if (!name.trim()) return;
    addMutation.mutate({ name: name.trim(), quantity: quantity.trim(), category, note: note.trim() });
  };

  const filtered = filter === "alle" ? items : items.filter(i => i.category === filter);
  const checkedCount = items.filter(i => i.checked).length;

  return (
    <div style={{ padding: "16px", maxWidth: 600, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Einkaufsliste</h1>
      <p style={{ color: "hsl(0 0% 50%)", fontSize: 13, marginBottom: 20 }}>
        {items.length} Artikel · {checkedCount} erledigt
      </p>

      {/* Add form */}
      <div className="wd-card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAdd()}
            placeholder="Artikel hinzufügen..."
            style={{
              background: "hsl(0 0% 12%)",
              border: "1px solid hsl(0 0% 20%)",
              borderRadius: 10,
              padding: "10px 14px",
              color: "hsl(0 0% 96%)",
              fontSize: 15,
              width: "100%",
              boxSizing: "border-box",
            }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="Menge (z.B. 2x, 500g)"
              style={{
                background: "hsl(0 0% 12%)",
                border: "1px solid hsl(0 0% 20%)",
                borderRadius: 10,
                padding: "10px 14px",
                color: "hsl(0 0% 96%)",
                fontSize: 14,
                flex: 1,
                boxSizing: "border-box",
              }}
            />
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{
                background: "hsl(0 0% 12%)",
                border: "1px solid hsl(0 0% 20%)",
                borderRadius: 10,
                padding: "10px 14px",
                color: "hsl(0 0% 96%)",
                fontSize: 14,
                flex: 1,
              }}
            >
              {CATEGORIES.filter(c => c.key !== "alle").map(c => (
                <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </div>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Notiz (optional)"
            style={{
              background: "hsl(0 0% 12%)",
              border: "1px solid hsl(0 0% 20%)",
              borderRadius: 10,
              padding: "10px 14px",
              color: "hsl(0 0% 96%)",
              fontSize: 14,
              width: "100%",
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={handleAdd}
            disabled={!name.trim() || addMutation.isPending}
            className="btn-cyan"
            style={{ width: "100%" }}
          >
            {addMutation.isPending ? "Wird hinzugefügt..." : "+ Hinzufügen"}
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            style={{
              background: filter === c.key ? "#22d3ee" : "hsl(0 0% 12%)",
              color: filter === c.key ? "#000" : "hsl(0 0% 70%)",
              border: "none",
              borderRadius: 20,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: filter === c.key ? 600 : 400,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* Items list */}
      {isLoading ? (
        <div style={{ textAlign: "center", color: "hsl(0 0% 50%)", padding: 40 }}>Lädt...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: "hsl(0 0% 40%)", padding: 40 }}>
          Keine Artikel{filter !== "alle" ? " in dieser Kategorie" : ""}
        </div>
      ) : (
        <div className="ios-list">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="ios-list-row"
              style={{ cursor: "pointer" }}
              onClick={() => toggleMutation.mutate({ id: item.id, checked: !item.checked })}
            >
              {/* Checkbox */}
              <div style={{
                width: 24, height: 24, borderRadius: 12, flexShrink: 0,
                background: item.checked ? "#4ade80" : "transparent",
                border: `2px solid ${item.checked ? "#4ade80" : "hsl(0 0% 30%)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {item.checked && (
                  <svg viewBox="0 0 12 10" width="12" height="10" fill="none">
                    <path d="M1 5l3.5 3.5L11 1" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: item.checked ? "hsl(0 0% 40%)" : "hsl(0 0% 96%)",
                  textDecoration: item.checked ? "line-through" : "none",
                }}>
                  {item.name}
                  {item.quantity && (
                    <span style={{ color: "#22d3ee", fontWeight: 400, marginLeft: 8, fontSize: 13 }}>
                      {item.quantity}
                    </span>
                  )}
                </div>
                {item.note && (
                  <div style={{ fontSize: 12, color: "hsl(0 0% 45%)", marginTop: 2 }}>{item.note}</div>
                )}
                <div style={{ fontSize: 11, color: "hsl(0 0% 35%)", marginTop: 1 }}>
                  {CATEGORIES.find(c => c.key === item.category)?.emoji} {CATEGORIES.find(c => c.key === item.category)?.label}
                </div>
              </div>
              {/* Delete */}
              <button
                onClick={e => { e.stopPropagation(); deleteMutation.mutate(item.id); }}
                style={{
                  background: "transparent", border: "none", color: "hsl(0 70% 50%)",
                  cursor: "pointer", padding: "4px 8px", fontSize: 18, lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Clear checked */}
      {checkedCount > 0 && (
        <button
          onClick={() => clearCheckedMutation.mutate()}
          style={{
            marginTop: 16,
            background: "transparent",
            border: "1px solid hsl(0 0% 20%)",
            borderRadius: 10,
            padding: "10px 16px",
            color: "hsl(0 0% 50%)",
            cursor: "pointer",
            fontSize: 14,
            width: "100%",
          }}
        >
          Erledigte löschen ({checkedCount})
        </button>
      )}
    </div>
  );
}
