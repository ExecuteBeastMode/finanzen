import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface NewsItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  image?: string;
  category?: string;
}

interface NewsResponse {
  items: NewsItem[];
  fetchedAt: string;
}

const SOURCES = [
  { key: "tagesschau", label: "Tagesschau" },
  { key: "spiegel", label: "Spiegel" },
  { key: "all", label: "Alle" },
] as const;

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000 / 60);
  if (diff < 1) return "gerade eben";
  if (diff < 60) return `vor ${diff} Min.`;
  const hours = Math.floor(diff / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  return `vor ${Math.floor(hours / 24)} Tagen`;
}

export default function NewsPage() {
  const [source, setSource] = useState<"tagesschau" | "spiegel" | "all">("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const { data, isLoading, error, isFetching } = useQuery<NewsResponse>({
    queryKey: ["/api/news", source, refreshKey],
    queryFn: () => apiRequest("GET", `/api/news?source=${source}`).then(r => r.json()),
    staleTime: 5 * 60 * 1000, // 5 min cache
    retry: 1,
  });

  const items = data?.items ?? [];

  return (
    <div style={{ padding: "20px 16px 100px", maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: 700, color: "hsl(0 0% 92%)", letterSpacing: "-0.02em", marginBottom: 2 }}>
            News
          </h1>
          <p style={{ fontSize: "0.72rem", color: "hsl(0 0% 40%)" }}>
            {data ? `Aktualisiert ${timeAgo(data.fetchedAt)}` : "Deutschland aktuell"}
          </p>
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={isFetching}
          style={{
            width: 36, height: 36, borderRadius: 9,
            background: "hsl(0 0% 10%)", border: "1px solid hsl(0 0% 18%)",
            color: isFetching ? "hsl(0 0% 30%)" : "hsl(0 0% 60%)",
            cursor: isFetching ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1rem",
            transition: "transform 0.3s",
            transform: isFetching ? "rotate(180deg)" : "none",
            WebkitTapHighlightColor: "transparent" as any,
          }}
          title="Aktualisieren"
        >
          ↻
        </button>
      </div>

      {/* Source tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18 }}>
        {SOURCES.map(s => (
          <button
            key={s.key}
            onClick={() => setSource(s.key)}
            style={{
              padding: "7px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              fontSize: "0.78rem", fontWeight: 600,
              background: source === s.key ? "rgba(74,222,128,0.15)" : "hsl(0 0% 10%)",
              color: source === s.key ? "#4ade80" : "hsl(0 0% 50%)",
              outline: source === s.key ? "1px solid rgba(74,222,128,0.3)" : "1px solid hsl(0 0% 15%)",
              transition: "all 0.12s",
              WebkitTapHighlightColor: "transparent" as any,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="wd-card" style={{ padding: "14px 16px", animation: "pulse 1.5s ease-in-out infinite" }}>
              <div style={{ height: 14, borderRadius: 4, background: "hsl(0 0% 14%)", marginBottom: 8, width: "80%" }} />
              <div style={{ height: 11, borderRadius: 4, background: "hsl(0 0% 11%)", width: "60%" }} />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div style={{ padding: "20px 16px", borderRadius: 12, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>📡</div>
          <div style={{ fontSize: "0.82rem", color: "hsl(0 0% 60%)", marginBottom: 4 }}>News konnten nicht geladen werden</div>
          <div style={{ fontSize: "0.7rem", color: "hsl(0 0% 38%)" }}>Prüfe deine Verbindung und versuche es erneut</div>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            style={{ marginTop: 12, padding: "8px 16px", borderRadius: 8, border: "none", background: "rgba(74,222,128,0.12)", color: "#4ade80", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {/* News list */}
      {!isLoading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {items.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "hsl(0 0% 38%)", fontSize: "0.82rem" }}>
              Keine Nachrichten gefunden
            </div>
          )}
          {items.map((item, i) => (
            <NewsCard key={i} item={item} />
          ))}
        </div>
      )}

      {/* Footer */}
      {items.length > 0 && (
        <div style={{ marginTop: 20, textAlign: "center", fontSize: "0.62rem", color: "hsl(0 0% 25%)" }}>
          Quellen: tagesschau.de · spiegel.de
        </div>
      )}
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const [pressed, setPressed] = useState(false);

  const sourceBadgeColor = item.source === "tagesschau"
    ? { bg: "rgba(96,165,250,0.12)", color: "#60a5fa", border: "rgba(96,165,250,0.25)" }
    : { bg: "rgba(251,146,60,0.1)", color: "#fb923c", border: "rgba(251,146,60,0.22)" };

  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        display: "block",
        padding: "14px 14px",
        borderRadius: 12,
        background: pressed ? "hsl(0 0% 9%)" : "hsl(0 0% 7%)",
        border: "1px solid hsl(0 0% 12%)",
        textDecoration: "none",
        marginBottom: 8,
        transition: "background 0.1s",
        WebkitTapHighlightColor: "transparent" as any,
      }}
    >
      {/* Source + time row */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <span style={{
          fontSize: "0.62rem", fontWeight: 600, padding: "2px 7px", borderRadius: 10,
          background: sourceBadgeColor.bg, color: sourceBadgeColor.color,
          border: `1px solid ${sourceBadgeColor.border}`,
        }}>
          {item.source === "tagesschau" ? "Tagesschau" : "Spiegel"}
        </span>
        {item.category && (
          <span style={{ fontSize: "0.6rem", color: "hsl(0 0% 38%)" }}>{item.category}</span>
        )}
        <span style={{ fontSize: "0.6rem", color: "hsl(0 0% 30%)", marginLeft: "auto" }}>
          {timeAgo(item.pubDate)}
        </span>
      </div>

      {/* Title */}
      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "hsl(0 0% 85%)", lineHeight: 1.4, marginBottom: 6 }}>
        {item.title}
      </div>

      {/* Description */}
      {item.description && (
        <div style={{
          fontSize: "0.73rem", color: "hsl(0 0% 45%)", lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        } as any}>
          {item.description}
        </div>
      )}

      {/* Read more arrow */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <span style={{ fontSize: "0.65rem", color: "hsl(0 0% 30%)" }}>Lesen →</span>
      </div>
    </a>
  );
}
