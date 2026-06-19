import { useEffect, useRef, useState, useCallback } from "react";

// ═══════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════
interface V2 { x: number; y: number; }
interface Tower {
  id: number; x: number; y: number; type: TT; level: number;
  lastShot: number; angle: number; xp: number;
  specialCooldown: number; killCount: number;
}
interface Enemy {
  id: number; pathIdx: number; progress: number;
  hp: number; maxHp: number; shield: number; maxShield: number;
  speed: number; baseSpeed: number;
  frozen: number; poisoned: number; burned: number; slowed: number;
  reward: number; type: ET; regen: number; flying: boolean;
  size: number; armor: number; split: boolean;
}
interface Projectile {
  id: number; x: number; y: number; tx: number; ty: number;
  vx: number; vy: number;
  dmg: number; speed: number; eid: number; color: string;
  ptype: "bullet"|"missile"|"laser"|"poison"|"freeze"|"chain"|"orbital";
  aoe: number; pierce: number; hitIds: Set<number>; size?: number;
}
interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string; size: number; gravity: number;
}
interface FloatingText { x: number; y: number; text: string; color: string; life: number; vy: number; }

type TT = "basic"|"sniper"|"rapid"|"freeze"|"mortar"|"laser"|"poison"|"tesla"|"oracle"|"nuke";
type ET = "soldier"|"runner"|"tank"|"boss"|"healer"|"ghost"|"swarm"|"armored"|"speeder"|"megaboss"|"drone"|"necro"|"juggernaut"|"phantom"|"titan";
type GamePhase = "menu"|"map_select"|"playing"|"gameover"|"victory";

// ═══════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════
const CELL = 36;
const COLS = 22;
const ROWS = 14;
const W = COLS * CELL;
const H = ROWS * CELL;
const TOTAL_WAVES = 25;

// ─── Map definitions ─────────────────────────────────────
interface MapDef {
  id: number;
  name: string;
  subtitle: string;
  difficulty: "Einfach" | "Mittel" | "Schwer" | "Extrem";
  diffColor: string;
  emoji: string;
  desc: string;
  path: V2[];
  startGold: number;
  startLives: number;
  bgColor: string;
  pathColor: string;
}

const MAP_DEFS: MapDef[] = [
  {
    id: 1,
    name: "S-Kurve",
    subtitle: "Klassischer Pfad",
    difficulty: "Einfach",
    diffColor: "#4ade80",
    emoji: "🌿",
    desc: "Ein geschwungener Pfad – ideal für Einsteiger. Viel Platz für Türme.",
    startGold: 250,
    startLives: 30,
    bgColor: "#0a1a0a",
    pathColor: "120,60%,22%",
    path: [
      {x:0,y:7},{x:1,y:7},{x:2,y:7},{x:3,y:7},{x:4,y:7},
      {x:4,y:6},{x:4,y:5},{x:4,y:4},{x:4,y:3},
      {x:5,y:3},{x:6,y:3},{x:7,y:3},{x:8,y:3},
      {x:8,y:4},{x:8,y:5},{x:8,y:6},{x:8,y:7},{x:8,y:8},{x:8,y:9},
      {x:9,y:9},{x:10,y:9},{x:11,y:9},{x:12,y:9},
      {x:12,y:8},{x:12,y:7},{x:12,y:6},{x:12,y:5},{x:12,y:4},{x:12,y:3},
      {x:13,y:3},{x:14,y:3},{x:15,y:3},
      {x:15,y:4},{x:15,y:5},{x:15,y:6},{x:15,y:7},{x:15,y:8},{x:15,y:9},{x:15,y:10},{x:15,y:11},
      {x:16,y:11},{x:17,y:11},{x:18,y:11},{x:19,y:11},{x:20,y:11},{x:21,y:11},
    ],
  },
  {
    id: 2,
    name: "Spirale",
    subtitle: "Eingeschlossene Mitte",
    difficulty: "Mittel",
    diffColor: "#fbbf24",
    emoji: "🌀",
    desc: "Spiralförmiger Pfad mit einem eingeschlossenen Zentrum – Platzierung ist entscheidend.",
    startGold: 220,
    startLives: 25,
    bgColor: "#0a0a1a",
    pathColor: "220,60%,20%",
    path: [
      {x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:5,y:2},{x:6,y:2},{x:7,y:2},
      {x:7,y:3},{x:7,y:4},{x:7,y:5},{x:7,y:6},{x:7,y:7},{x:7,y:8},{x:7,y:9},{x:7,y:10},{x:7,y:11},
      {x:8,y:11},{x:9,y:11},{x:10,y:11},{x:11,y:11},{x:12,y:11},{x:13,y:11},{x:14,y:11},
      {x:14,y:10},{x:14,y:9},{x:14,y:8},{x:14,y:7},{x:14,y:6},{x:14,y:5},{x:14,y:4},
      {x:15,y:4},{x:16,y:4},{x:17,y:4},{x:18,y:4},
      {x:18,y:5},{x:18,y:6},{x:18,y:7},{x:18,y:8},{x:18,y:9},
      {x:19,y:9},{x:20,y:9},{x:21,y:9},
    ],
  },
  {
    id: 3,
    name: "Zickzack-Gauntlet",
    subtitle: "Enger Todeskanal",
    difficulty: "Schwer",
    diffColor: "#f97316",
    emoji: "⚡",
    desc: "Mehrere enge Kurven – wenig Platz, maximaler Druck. Nur für Profis.",
    startGold: 200,
    startLives: 20,
    bgColor: "#1a0a00",
    pathColor: "30,60%,18%",
    path: [
      {x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:4,y:1},
      {x:4,y:2},{x:4,y:3},{x:4,y:4},{x:4,y:5},{x:4,y:6},{x:4,y:7},
      {x:5,y:7},{x:6,y:7},{x:7,y:7},
      {x:7,y:6},{x:7,y:5},{x:7,y:4},{x:7,y:3},{x:7,y:2},{x:7,y:1},
      {x:8,y:1},{x:9,y:1},{x:10,y:1},{x:11,y:1},
      {x:11,y:2},{x:11,y:3},{x:11,y:4},{x:11,y:5},{x:11,y:6},{x:11,y:7},{x:11,y:8},{x:11,y:9},{x:11,y:10},{x:11,y:11},{x:11,y:12},
      {x:12,y:12},{x:13,y:12},{x:14,y:12},{x:15,y:12},
      {x:15,y:11},{x:15,y:10},{x:15,y:9},{x:15,y:8},{x:15,y:7},{x:15,y:6},{x:15,y:5},{x:15,y:4},{x:15,y:3},{x:15,y:2},{x:15,y:1},
      {x:16,y:1},{x:17,y:1},{x:18,y:1},{x:19,y:1},{x:20,y:1},{x:21,y:1},
    ],
  },
  {
    id: 4,
    name: "Labyrinth",
    subtitle: "Total verwirrend",
    difficulty: "Extrem",
    diffColor: "#ef4444",
    emoji: "💀",
    desc: "Extrem kurzer Pfad – Gegner kommen schneller ans Ziel. Kein Erbarmen.",
    startGold: 180,
    startLives: 15,
    bgColor: "#1a0000",
    pathColor: "0,60%,18%",
    path: [
      {x:0,y:6},{x:1,y:6},{x:2,y:6},
      {x:2,y:5},{x:2,y:4},{x:2,y:3},{x:2,y:2},
      {x:3,y:2},{x:4,y:2},{x:5,y:2},{x:6,y:2},{x:7,y:2},
      {x:7,y:3},{x:7,y:4},{x:7,y:5},{x:7,y:6},{x:7,y:7},{x:7,y:8},
      {x:8,y:8},{x:9,y:8},{x:10,y:8},{x:11,y:8},
      {x:11,y:7},{x:11,y:6},{x:11,y:5},{x:11,y:4},{x:11,y:3},{x:11,y:2},
      {x:12,y:2},{x:13,y:2},{x:14,y:2},{x:15,y:2},
      {x:15,y:3},{x:15,y:4},{x:15,y:5},{x:15,y:6},{x:15,y:7},{x:15,y:8},{x:15,y:9},{x:15,y:10},
      {x:16,y:10},{x:17,y:10},{x:18,y:10},{x:19,y:10},{x:20,y:10},{x:21,y:10},
    ],
  },
];

// ─── Tower defs ──────────────────────────────────────────
const TD: Record<TT, { cost: number; color: string; range: number; dmg: number; rate: number; label: string; emoji: string; desc: string; special: string; upgCost: number[] }> = {
  basic:  { cost:50,  color:"#22d3ee", range:3.5, dmg:22,  rate:900,  label:"Standard",  emoji:"🔵", desc:"Ausgewogen",              special:"Schnellfeuer",  upgCost:[75,150,300] },
  sniper: { cost:100, color:"#a78bfa", range:7.5, dmg:100, rate:2200, label:"Sniper",    emoji:"🟣", desc:"Hohe Reichweite",        special:"Durchschuß",   upgCost:[120,240,480] },
  rapid:  { cost:75,  color:"#fbbf24", range:2.5, dmg:14,  rate:240,  label:"Rapid",     emoji:"🟡", desc:"Sehr schnell",           special:"Doppelschuss", upgCost:[100,200,400] },
  freeze: { cost:90,  color:"#67e8f9", range:3.2, dmg:6,   rate:1300, label:"Freeze",    emoji:"🔷", desc:"Friert ein",             special:"Blizzard",     upgCost:[110,220,440] },
  mortar: { cost:120, color:"#f97316", range:5.5, dmg:65,  rate:2800, label:"Mörser",    emoji:"🟠", desc:"Flächenschaden",         special:"Cluster",      upgCost:[150,300,600] },
  laser:  { cost:150, color:"#f43f5e", range:4.5, dmg:38,  rate:700,  label:"Laser",     emoji:"🔴", desc:"Panzerbrechend",         special:"Overcharge",   upgCost:[175,350,700] },
  poison: { cost:80,  color:"#4ade80", range:3.5, dmg:10,  rate:1100, label:"Gift",      emoji:"🟢", desc:"DoT Vergiftung",         special:"Seuche",       upgCost:[100,200,400] },
  tesla:  { cost:175, color:"#c084fc", range:3.8, dmg:45,  rate:1600, label:"Tesla",     emoji:"🔮", desc:"Kettenblitz",            special:"Supernova",    upgCost:[200,400,800] },
  oracle: { cost:200, color:"#fb923c", range:8.0, dmg:0,   rate:3000, label:"Oracle",    emoji:"🔶", desc:"Verlangsamt alle in Radius",special:"Prophecy",  upgCost:[250,500,1000] },
  nuke:   { cost:500, color:"#ff0000", range:6.0, dmg:500, rate:8000, label:"NUKE",      emoji:"☢️", desc:"Mega-AoE Vernichter",   special:"Meltdown",     upgCost:[600,1200,2400] },
};

// ─── Enemy defs ──────────────────────────────────────────
const ED: Record<ET, { hp: number; spd: number; reward: number; color: string; sz: number; shield: number; regen: number; armor: number; flying: boolean; split: boolean; label: string; emoji: string }> = {
  soldier:    { hp:90,   spd:0.9,  reward:10,  color:"#f87171", sz:10, shield:0,    regen:0,  armor:0,   flying:false, split:false, label:"Soldat",     emoji:"🔴" },
  runner:     { hp:50,   spd:2.3,  reward:15,  color:"#fb923c", sz:8,  shield:0,    regen:0,  armor:0,   flying:false, split:false, label:"Läufer",     emoji:"🟠" },
  tank:       { hp:400,  spd:0.45, reward:40,  color:"#6b7280", sz:16, shield:0,    regen:0,  armor:50,  flying:false, split:false, label:"Panzer",     emoji:"⚫" },
  boss:       { hp:1400, spd:0.35, reward:150, color:"#dc2626", sz:18, shield:200,  regen:8,  armor:20,  flying:false, split:false, label:"Boss",       emoji:"💀" },
  healer:     { hp:130,  spd:0.75, reward:30,  color:"#34d399", sz:11, shield:0,    regen:0,  armor:0,   flying:false, split:false, label:"Heiler",     emoji:"💚" },
  ghost:      { hp:70,   spd:1.6,  reward:25,  color:"#c4b5fd", sz:9,  shield:0,    regen:0,  armor:0,   flying:true,  split:false, label:"Geist",      emoji:"👻" },
  swarm:      { hp:28,   spd:1.9,  reward:5,   color:"#fde68a", sz:6,  shield:0,    regen:0,  armor:0,   flying:false, split:false, label:"Schwarm",    emoji:"🟡" },
  armored:    { hp:220,  spd:0.6,  reward:45,  color:"#475569", sz:13, shield:180,  regen:0,  armor:30,  flying:false, split:false, label:"Gepanzert",  emoji:"🛡️" },
  speeder:    { hp:60,   spd:3.2,  reward:22,  color:"#f0abfc", sz:8,  shield:0,    regen:0,  armor:0,   flying:false, split:false, label:"Speedster",  emoji:"⚡" },
  megaboss:   { hp:5000, spd:0.25, reward:400, color:"#7f1d1d", sz:22, shield:600,  regen:25, armor:40,  flying:false, split:false, label:"MEGA BOSS",  emoji:"☠️" },
  drone:      { hp:45,   spd:2.0,  reward:18,  color:"#7dd3fc", sz:7,  shield:0,    regen:0,  armor:0,   flying:true,  split:false, label:"Drohne",     emoji:"🛸" },
  necro:      { hp:180,  spd:0.65, reward:55,  color:"#581c87", sz:13, shield:0,    regen:12, armor:0,   flying:false, split:true,  label:"Nekromant",  emoji:"🧟" },
  juggernaut: { hp:800,  spd:0.5,  reward:90,  color:"#dc2626", sz:17, shield:300,  regen:15, armor:60,  flying:false, split:false, label:"Juggernaut", emoji:"🦾" },
  phantom:    { hp:100,  spd:2.5,  reward:35,  color:"#818cf8", sz:9,  shield:0,    regen:0,  armor:0,   flying:true,  split:false, label:"Phantom",    emoji:"🌀" },
  titan:      { hp:8000, spd:0.2,  reward:600, color:"#450a0a", sz:25, shield:1000, regen:40, armor:80,  flying:false, split:false, label:"TITAN",      emoji:"💥" },
};

// ─── Wave composer ────────────────────────────────────────
function makeWave(w: number): ET[] {
  const out: ET[] = [];
  const n = (base: number, ...types: ET[]) => { for(let i=0;i<base+Math.floor(w*0.8);i++) out.push(types[Math.floor(Math.random()*types.length)]); };
  if (w===1)  { n(6,"soldier"); }
  else if (w===2)  { n(8,"soldier","runner"); }
  else if (w===3)  { n(10,"soldier","runner"); out.push("tank"); }
  else if (w===4)  { n(12,"soldier","runner","healer"); out.push("tank","tank"); }
  else if (w===5)  { out.push("boss"); n(8,"runner","soldier"); }
  else if (w===6)  { n(25,"swarm"); n(4,"healer"); }
  else if (w===7)  { n(8,"armored","ghost"); out.push("boss"); }
  else if (w===8)  { n(6,"drone"); n(8,"speeder"); out.push("boss","boss"); }
  else if (w===9)  { n(5,"juggernaut"); n(10,"swarm","runner"); }
  else if (w===10) { out.push("boss","boss","boss"); n(8,"armored","tank"); }
  else if (w===11) { n(35,"swarm","drone"); n(6,"healer"); }
  else if (w===12) { n(8,"necro"); n(10,"speeder","phantom"); }
  else if (w===13) { n(4,"juggernaut"); n(6,"ghost","phantom"); out.push("boss","boss"); }
  else if (w===14) { n(6,"armored"); n(10,"necro","speeder"); out.push("boss","boss","boss"); }
  else if (w===15) { n(5,"juggernaut"); n(8,"armored"); out.push("megaboss"); }
  else if (w===16) { n(50,"swarm","drone"); n(8,"healer","necro"); }
  else if (w===17) { n(6,"boss"); n(8,"phantom","ghost"); n(6,"speeder"); }
  else if (w===18) { n(4,"juggernaut"); n(6,"armored","tank"); n(8,"drone","speeder"); n(4,"boss"); }
  else if (w===19) { out.push("megaboss"); n(6,"boss"); n(12,"necro","juggernaut"); }
  else if (w===20) { out.push("megaboss","megaboss"); n(10,"boss"); n(15,"speeder","drone"); }
  else if (w===21) { n(10,"titan"); n(20,"swarm","runner"); }
  else if (w===22) { out.push("titan"); n(8,"megaboss"); n(15,"armored","juggernaut"); }
  else if (w===23) { n(4,"titan"); n(10,"megaboss"); n(20,"speeder","phantom","drone"); }
  else if (w===24) { n(6,"titan"); n(12,"megaboss"); n(20,"necro","juggernaut","ghost"); }
  else if (w===25) { n(8,"titan"); n(15,"megaboss"); out.push("titan","titan"); n(30,"swarm","drone","speeder"); }
  return out;
}

// ─── Tower upgrade stats ─────────────────────────────────
function towerStats(type: TT, level: number) {
  const b = TD[type];
  const mult = 1 + (level-1)*0.45;
  return { dmg: b.dmg * mult, range: b.range * (1+(level-1)*0.15), rate: b.rate * (1-(level-1)*0.08), cost: b.upgCost[level-1] || 9999 };
}

// ─── MapSelectScreen ─────────────────────────────────────
function MapSelectScreen({ onSelect }: { onSelect: (map: MapDef) => void }) {
  const [hovered, setHovered] = useState<number|null>(null);
  const [animMap, setAnimMap] = useState<Record<number,number>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimMap(prev => {
        const next = {...prev};
        MAP_DEFS.forEach(m => { next[m.id] = (prev[m.id]||0) + 1; });
        return next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #020408 0%, #0a0f1e 50%, #020408 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px 12px",
      fontFamily: "Inter, -apple-system, sans-serif",
    }}>
      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🏰</div>
        <h1 style={{
          fontSize: "clamp(28px, 6vw, 48px)",
          fontWeight: 900,
          margin: 0,
          background: "linear-gradient(90deg, #22d3ee, #a78bfa, #f43f5e)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: "-1px",
          lineHeight: 1,
        }}>
          TOWER DEFENCE
        </h1>
        <div style={{ fontSize: 14, color: "hsl(0 0% 40%)", marginTop: 8, letterSpacing: 3, textTransform: "uppercase" }}>
          Ultimate Edition — Wähle deine Karte
        </div>
      </div>

      {/* Map Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 16,
        width: "100%",
        maxWidth: 900,
      }}>
        {MAP_DEFS.map(map => {
          const isHov = hovered === map.id;
          const t = (animMap[map.id]||0) * 0.05;
          return (
            <div
              key={map.id}
              onMouseEnter={() => setHovered(map.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(map)}
              style={{
                background: isHov
                  ? `linear-gradient(135deg, ${map.bgColor}, hsl(0 0% 10%))`
                  : "hsl(0 0% 6%)",
                border: `2px solid ${isHov ? map.diffColor : "hsl(0 0% 14%)"}`,
                borderRadius: 16,
                padding: "20px 18px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                transform: isHov ? "translateY(-4px) scale(1.02)" : "none",
                boxShadow: isHov ? `0 12px 40px ${map.diffColor}33` : "none",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Animated bg dots */}
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", opacity: isHov ? 0.15 : 0.05,
              }}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    width: 4, height: 4,
                    borderRadius: "50%",
                    background: map.diffColor,
                    left: `${(Math.sin(t + i * 0.8) * 0.5 + 0.5) * 100}%`,
                    top: `${(Math.cos(t + i * 1.2) * 0.5 + 0.5) * 100}%`,
                    transition: "none",
                  }} />
                ))}
              </div>

              {/* Difficulty badge */}
              <div style={{
                position: "absolute", top: 14, right: 14,
                background: `${map.diffColor}22`,
                border: `1px solid ${map.diffColor}66`,
                borderRadius: 20,
                padding: "2px 10px",
                fontSize: 11,
                fontWeight: 700,
                color: map.diffColor,
                letterSpacing: 1,
              }}>
                {map.difficulty}
              </div>

              {/* Map number */}
              <div style={{
                fontSize: 11, color: "hsl(0 0% 30%)", fontWeight: 600,
                letterSpacing: 2, textTransform: "uppercase", marginBottom: 8,
              }}>
                Karte {map.id}
              </div>

              {/* Name & emoji */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 28 }}>{map.emoji}</span>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#f1f5f9", lineHeight: 1 }}>{map.name}</div>
                  <div style={{ fontSize: 12, color: "hsl(0 0% 45%)", marginTop: 2 }}>{map.subtitle}</div>
                </div>
              </div>

              {/* Description */}
              <div style={{ fontSize: 12, color: "hsl(0 0% 50%)", lineHeight: 1.5, marginBottom: 14 }}>
                {map.desc}
              </div>

              {/* Stats */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <div style={{
                  background: "hsl(0 0% 9%)", borderRadius: 8, padding: "5px 10px", fontSize: 11, textAlign: "center", flex: 1,
                }}>
                  <div style={{ color: "#fbbf24", fontWeight: 700 }}>💰 {map.startGold}</div>
                  <div style={{ color: "hsl(0 0% 35%)", fontSize: 10 }}>Startgold</div>
                </div>
                <div style={{
                  background: "hsl(0 0% 9%)", borderRadius: 8, padding: "5px 10px", fontSize: 11, textAlign: "center", flex: 1,
                }}>
                  <div style={{ color: "#ef4444", fontWeight: 700 }}>❤️ {map.startLives}</div>
                  <div style={{ color: "hsl(0 0% 35%)", fontSize: 10 }}>Leben</div>
                </div>
                <div style={{
                  background: "hsl(0 0% 9%)", borderRadius: 8, padding: "5px 10px", fontSize: 11, textAlign: "center", flex: 1,
                }}>
                  <div style={{ color: "#22d3ee", fontWeight: 700 }}>🌊 25</div>
                  <div style={{ color: "hsl(0 0% 35%)", fontSize: 10 }}>Wellen</div>
                </div>
              </div>

              {/* Mini path preview canvas */}
              <MiniPathPreview path={map.path} color={map.diffColor} />

              {/* Play button */}
              <button style={{
                width: "100%",
                background: isHov ? `linear-gradient(90deg, ${map.diffColor}cc, ${map.diffColor}88)` : "hsl(0 0% 10%)",
                border: `1px solid ${isHov ? map.diffColor : "hsl(0 0% 18%)"}`,
                borderRadius: 10,
                padding: "10px",
                color: isHov ? "#000" : "hsl(0 0% 55%)",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 700,
                marginTop: 12,
                transition: "all 0.2s",
                letterSpacing: 1,
              }}>
                {isHov ? `▶ SPIELEN` : "Auswählen"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div style={{ marginTop: 24, fontSize: 12, color: "hsl(0 0% 25%)", textAlign: "center" }}>
        Alle 25 Wellen auf allen Karten — 10 Turmtypen · 15 Gegnertypen · Boss-Kämpfe
      </div>
    </div>
  );
}

// Mini path preview using canvas
function MiniPathPreview({ path, color }: { path: V2[]; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d")!;
    const W2 = c.width, H2 = c.height;
    const xs = path.map(p => p.x), ys = path.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = 8;
    const scaleX = (W2 - pad*2) / (maxX - minX + 1);
    const scaleY = (H2 - pad*2) / (maxY - minY + 1);
    const sc = Math.min(scaleX, scaleY);
    const offX = pad + ((W2 - pad*2) - (maxX - minX + 1) * sc) / 2;
    const offY = pad + ((H2 - pad*2) - (maxY - minY + 1) * sc) / 2;
    const px = (x: number) => offX + (x - minX + 0.5) * sc;
    const py = (y: number) => offY + (y - minY + 0.5) * sc;

    ctx.clearRect(0, 0, W2, H2);
    ctx.fillStyle = "hsl(0 0% 8%)";
    ctx.fillRect(0, 0, W2, H2);

    // Draw path
    ctx.strokeStyle = color + "88";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    path.forEach((p, i) => {
      if (i === 0) ctx.moveTo(px(p.x), py(p.y));
      else ctx.lineTo(px(p.x), py(p.y));
    });
    ctx.stroke();

    // Start/end
    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.arc(px(path[0].x), py(path[0].y), 4, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(px(path[path.length-1].x), py(path[path.length-1].y), 4, 0, Math.PI*2);
    ctx.fill();
  }, [path, color]);

  return (
    <canvas
      ref={ref}
      width={200}
      height={70}
      style={{ width: "100%", height: 70, borderRadius: 8, display: "block" }}
    />
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN GAME COMPONENT
// ═══════════════════════════════════════════════════════════
function GameCanvas({ mapDef, onBackToMenu }: { mapDef: MapDef; onBackToMenu: () => void }) {
  const cvs = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const lastT = useRef(0);

  const G = useRef({
    towers: [] as Tower[],
    enemies: [] as Enemy[],
    projs: [] as Projectile[],
    parts: [] as Particle[],
    floats: [] as FloatingText[],
    gold: mapDef.startGold,
    lives: mapDef.startLives,
    wave: 0,
    score: 0,
    waveActive: false,
    spawnQ: [] as ET[],
    spawnTimer: 0,
    nid: 1,
    gameOver: false,
    won: false,
    map: mapDef.path,
    pathSet: new Set(mapDef.path.map(p=>`${p.x},${p.y}`)),
    speed: 1,
    kills: 0,
    selectedTower: null as Tower | null,
    bossWarning: 0,
    comboKills: 0,
    comboTimer: 0,
    goldStreak: 0,
  });

  const [ui, setUi] = useState({
    gold: mapDef.startGold, lives: mapDef.startLives,
    wave: 0, score: 0, waveActive: false,
    gameOver: false, won: false, speed: 1, kills: 0,
  });
  const [selType, setSelType] = useState<TT>("basic");
  const [placing, setPlacing] = useState(false);
  const [hover, setHover] = useState<V2|null>(null);
  const [selTower, setSelTower] = useState<Tower|null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [showWaveInfo, setShowWaveInfo] = useState<ET[]|null>(null);

  const sync = useCallback(() => {
    const g = G.current;
    setUi({ gold:g.gold, lives:g.lives, wave:g.wave, score:g.score, waveActive:g.waveActive, gameOver:g.gameOver, won:g.won, speed:g.speed, kills:g.kills });
    setSelTower(g.selectedTower ? {...g.selectedTower} : null);
  }, []);

  const dist = (a:V2, b:V2) => Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2);
  const ePos = (e:Enemy): V2 => {
    const path = G.current.map;
    const f = path[e.pathIdx], t = path[Math.min(e.pathIdx+1, path.length-1)];
    return { x:(f.x+(t.x-f.x)*e.progress+0.5)*CELL, y:(f.y+(t.y-f.y)*e.progress+0.5)*CELL };
  };

  const burst = (x:number, y:number, color:string, n=8, fast=false) => {
    for(let i=0;i<n;i++){
      const a=Math.random()*Math.PI*2, s=(fast?2:1)+Math.random()*3;
      G.current.parts.push({ x,y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, life:.5+Math.random()*.4, maxLife:.5+Math.random()*.4, color, size:2+Math.random()*3, gravity:fast?0.05:0.08 });
    }
  };

  const float = (x:number,y:number,txt:string,color:string) => {
    G.current.floats.push({x,y,text:txt,color,life:1.2,vy:-1.2});
  };

  const dmgEnemy = useCallback((e:Enemy, dmg:number, src:string) => {
    const g = G.current;
    if(e.type==="ghost"&&src==="freeze") return;
    if(e.type==="phantom"&&src==="poison") return;
    const armor = (src==="laser"||src==="sniper") ? 0 : e.armor;
    const effDmg = Math.max(1, dmg * (1 - armor/100));
    if(src==="laser"||src==="sniper") {
      e.hp -= dmg;
    } else if(e.shield>0) {
      const sd = Math.min(e.shield, effDmg); e.shield -= sd;
      const rem = effDmg - sd; if(rem>0) e.hp -= rem;
    } else {
      e.hp -= effDmg;
    }
    if(e.hp<=0) {
      const p = ePos(e);
      g.score += e.reward; g.gold += e.reward; g.kills++;
      g.comboKills++; g.comboTimer = 2;
      burst(p.x,p.y,"#fbbf24",12,true);

      // Combo bonus
      if(g.comboKills >= 5) {
        const bonus = Math.floor(g.comboKills * 2);
        g.gold += bonus;
        float(p.x, p.y-20, `🔥 COMBO x${g.comboKills} +${bonus}💰`, "#f97316");
      } else {
        float(p.x,p.y,`+${e.reward}💰`,"#fbbf24");
      }

      if(e.split && e.type==="necro") {
        for(let i=0;i<3;i++){
          const def=ED["swarm"];
          g.enemies.push({ id:g.nid++, pathIdx:e.pathIdx, progress:e.progress+i*0.01, hp:def.hp, maxHp:def.hp, shield:0, maxShield:0, speed:def.spd, baseSpeed:def.spd, frozen:0, poisoned:0, burned:0, slowed:0, reward:def.reward, type:"swarm", regen:0, flying:false, size:def.sz, armor:0, split:false });
        }
      }
      g.enemies = g.enemies.filter(x=>x.id!==e.id);
      for(const t of g.towers) {
        const tc={x:(t.x+.5)*CELL,y:(t.y+.5)*CELL};
        if(dist(tc,ePos(e))<=TD[t.type].range*CELL*1.5) { t.xp+=e.reward; t.killCount++; }
      }
    }
  }, []);

  const aoeHit = useCallback((cx:number, cy:number, r:number, dmg:number, src:string) => {
    for(const e of G.current.enemies) { if(dist(ePos(e),{x:cx,y:cy})<=r) dmgEnemy(e,dmg,src); }
  }, [dmgEnemy]);

  const draw = useCallback(() => {
    const c = cvs.current; if(!c) return;
    const ctx = c.getContext("2d")!;
    const g = G.current;
    const path = g.map;

    // ── Background ──
    ctx.fillStyle = mapDef.bgColor;
    ctx.fillRect(0,0,W,H);

    // Subtle grid
    for(let row=0;row<ROWS;row++) for(let col=0;col<COLS;col++) {
      const ip = g.pathSet.has(`${col},${row}`);
      ctx.fillStyle = ip ? `hsla(${mapDef.pathColor},0.7)` : "rgba(0,0,0,0)";
      if(ip) ctx.fillRect(col*CELL,row*CELL,CELL,CELL);
      ctx.strokeStyle = "rgba(255,255,255,0.02)";
      ctx.lineWidth=.3;
      ctx.strokeRect(col*CELL,row*CELL,CELL,CELL);
    }

    // ── Glowing Path ──
    // Outer glow
    ctx.shadowBlur = 12;
    ctx.shadowColor = mapDef.diffColor + "44";
    for(let i=0;i<path.length-1;i++){
      const a=path[i],b=path[i+1];
      const t=i/(path.length-1);
      ctx.strokeStyle=`hsla(${mapDef.pathColor},${0.15+t*0.1})`;
      ctx.lineWidth=CELL*0.78;
      ctx.lineCap="round";
      ctx.beginPath();
      ctx.moveTo((a.x+.5)*CELL,(a.y+.5)*CELL);
      ctx.lineTo((b.x+.5)*CELL,(b.y+.5)*CELL);
      ctx.stroke();
    }
    ctx.shadowBlur=0;

    // Path center lane
    for(let i=0;i<path.length-1;i++){
      const a=path[i],b=path[i+1];
      const t=i/(path.length-1);
      ctx.strokeStyle=`hsla(${mapDef.pathColor},${0.55+t*0.15})`;
      ctx.lineWidth=CELL*0.36;
      ctx.lineCap="round";
      ctx.beginPath();
      ctx.moveTo((a.x+.5)*CELL,(a.y+.5)*CELL);
      ctx.lineTo((b.x+.5)*CELL,(b.y+.5)*CELL);
      ctx.stroke();
    }

    // Arrow indicators on path
    for(let i=2;i<path.length-1;i+=4){
      const a=path[i],b=path[Math.min(i+1,path.length-1)];
      const ax=(a.x+.5)*CELL,ay=(a.y+.5)*CELL;
      const bx=(b.x+.5)*CELL,by=(b.y+.5)*CELL;
      const angle=Math.atan2(by-ay,bx-ax);
      ctx.save();
      ctx.translate(ax+(bx-ax)*0.5,ay+(by-ay)*0.5);
      ctx.rotate(angle);
      ctx.fillStyle="rgba(255,255,255,0.12)";
      ctx.font="10px Arial";
      ctx.textAlign="center";
      ctx.fillText("▸",0,4);
      ctx.restore();
    }

    // Start/End markers
    const sp=path[0], ep=path[path.length-1];
    ctx.shadowColor="#4ade80"; ctx.shadowBlur=16;
    ctx.fillStyle="#4ade80";
    ctx.font="bold 15px Arial"; ctx.textAlign="center";
    ctx.fillText("▶",(sp.x+.5)*CELL,(sp.y+.5)*CELL+5);
    ctx.shadowColor="#ef4444";
    ctx.fillStyle="#ef4444";
    ctx.fillText("✕",(ep.x+.5)*CELL,(ep.y+.5)*CELL+5);
    ctx.shadowBlur=0;

    // ── Hover ──
    if(hover && placing){
      const ok = !g.pathSet.has(`${hover.x},${hover.y}`) && !g.towers.find(t=>t.x===hover.x&&t.y===hover.y);
      ctx.fillStyle = ok?"rgba(34,211,238,0.18)":"rgba(239,68,68,0.18)";
      ctx.fillRect(hover.x*CELL,hover.y*CELL,CELL,CELL);
      ctx.strokeStyle = ok?"rgba(34,211,238,0.7)":"rgba(239,68,68,0.7)";
      ctx.lineWidth=1.5;
      ctx.strokeRect(hover.x*CELL,hover.y*CELL,CELL,CELL);
      const s2 = towerStats(selType,1);
      ctx.beginPath();
      ctx.arc((hover.x+.5)*CELL,(hover.y+.5)*CELL,s2.range*CELL,0,Math.PI*2);
      ctx.strokeStyle="rgba(34,211,238,0.35)";
      ctx.lineWidth=1.5;
      ctx.setLineDash([5,5]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle="rgba(34,211,238,0.04)";
      ctx.fill();
    }

    // ── Selected tower range ──
    if(g.selectedTower) {
      const t=g.selectedTower;
      const s2=towerStats(t.type,t.level);
      ctx.beginPath();
      ctx.arc((t.x+.5)*CELL,(t.y+.5)*CELL,s2.range*CELL,0,Math.PI*2);
      ctx.strokeStyle="rgba(255,255,255,0.25)";
      ctx.lineWidth=1.5;
      ctx.setLineDash([4,4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle="rgba(255,255,255,0.03)";
      ctx.fill();
    }

    // ── Towers ──
    for(const t of g.towers) {
      const def=TD[t.type]; const s2=towerStats(t.type,t.level);
      const cx=(t.x+.5)*CELL, cy=(t.y+.5)*CELL;
      const isSel = g.selectedTower?.id===t.id;

      // Outer selection ring
      if(isSel) {
        ctx.strokeStyle=def.color;
        ctx.lineWidth=2;
        ctx.shadowColor=def.color; ctx.shadowBlur=12;
        ctx.beginPath();
        if(ctx.roundRect) ctx.roundRect(t.x*CELL+1,t.y*CELL+1,CELL-2,CELL-2,8);
        else ctx.rect(t.x*CELL+1,t.y*CELL+1,CELL-2,CELL-2);
        ctx.stroke();
        ctx.shadowBlur=0;
      }

      // Base plate
      const grad = ctx.createRadialGradient(cx,cy,0,cx,cy,CELL*.55);
      grad.addColorStop(0, isSel?"#1e3a5f":"#111827");
      grad.addColorStop(1, isSel?"#0f1f3a":"#0a0f18");
      ctx.fillStyle=grad;
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(t.x*CELL+2,t.y*CELL+2,CELL-4,CELL-4,6);
      else ctx.rect(t.x*CELL+2,t.y*CELL+2,CELL-4,CELL-4);
      ctx.fill();

      // Glow halo
      ctx.shadowColor=def.color; ctx.shadowBlur=t.level*5+8;
      ctx.fillStyle=def.color;
      ctx.globalAlpha=0.88;
      ctx.beginPath();
      ctx.arc(cx,cy,CELL*0.28*(1+(t.level-1)*0.12),0,Math.PI*2);
      ctx.fill();
      ctx.globalAlpha=1; ctx.shadowBlur=0;

      // Inner dot
      ctx.fillStyle="#fff";
      ctx.globalAlpha=0.5;
      ctx.beginPath();
      ctx.arc(cx-CELL*.06,cy-CELL*.06,CELL*.06,0,Math.PI*2);
      ctx.fill();
      ctx.globalAlpha=1;

      // Barrel
      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate(t.angle||0);
      ctx.shadowColor=def.color; ctx.shadowBlur=6;
      ctx.strokeStyle=def.color;
      ctx.lineWidth=t.type==="mortar"?4:t.type==="nuke"?5:2.5;
      ctx.lineCap="round";
      ctx.beginPath(); ctx.moveTo(2,0);
      const bLen = t.type==="sniper"||t.type==="oracle"?CELL*.52:t.type==="mortar"||t.type==="nuke"?CELL*.29:CELL*.38;
      ctx.lineTo(bLen,0);
      ctx.stroke();
      if(t.type==="nuke") {
        ctx.strokeStyle=`rgba(255,0,0,${0.2+Math.sin(Date.now()*0.003)*0.1})`;
        ctx.lineWidth=1;
        ctx.beginPath();
        ctx.arc(0,0,CELL*.44,0,Math.PI*2);
        ctx.stroke();
      }
      ctx.shadowBlur=0;
      ctx.restore();

      // Level stars
      if(t.level>1) {
        for(let i=0;i<t.level-1;i++){
          ctx.fillStyle="#fbbf24";
          ctx.font="bold 8px Arial"; ctx.textAlign="center";
          ctx.fillText("★",cx-6+i*6,cy+CELL*.43);
        }
      }
      // Kill badge
      if(t.killCount>=10) {
        ctx.fillStyle="#ef4444";
        ctx.shadowColor="#ef4444"; ctx.shadowBlur=4;
        ctx.font="bold 7px Arial"; ctx.textAlign="right";
        ctx.fillText(`${t.killCount}☠`,t.x*CELL+CELL-1,t.y*CELL+10);
        ctx.shadowBlur=0;
      }
    }

    // ── Enemies ──
    for(const en of g.enemies) {
      const def=ED[en.type];
      const pos=ePos(en);
      const frz=en.frozen>0, psn=en.poisoned>0, brn=en.burned>0;

      if(en.flying) {
        ctx.globalAlpha=0.65;
        ctx.strokeStyle=en.type==="ghost"?"rgba(196,181,253,0.4)":en.type==="drone"?"rgba(125,211,252,0.4)":"rgba(129,140,248,0.4)";
        ctx.lineWidth=1;
        ctx.setLineDash([3,3]);
        ctx.beginPath();
        ctx.arc(pos.x,pos.y,en.size+5,0,Math.PI*2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha=1;
      }

      // Shadow
      ctx.fillStyle="rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(pos.x,pos.y+en.size*.85,en.size*.65,en.size*.2,0,0,Math.PI*2);
      ctx.fill();

      // Boss pulse ring
      if(en.type==="boss"||en.type==="megaboss"||en.type==="titan") {
        const pulse = (Date.now()%1000)/1000;
        ctx.beginPath();
        ctx.arc(pos.x,pos.y,en.size+6+pulse*10,0,Math.PI*2);
        ctx.strokeStyle=`rgba(220,38,38,${0.6-pulse*0.6})`;
        ctx.lineWidth=2.5;
        ctx.stroke();
      }

      // Glow
      ctx.shadowColor=frz?"#67e8f9":psn?"#4ade80":brn?"#f97316":def.color;
      ctx.shadowBlur = (en.type==="boss"||en.type==="megaboss"||en.type==="titan")?18:5;

      // Body gradient
      const eg = ctx.createRadialGradient(pos.x-en.size*.3,pos.y-en.size*.3,0,pos.x,pos.y,en.size);
      const baseColor = frz?"#a5f3fc":psn?"#86efac":brn?"#fed7aa":def.color;
      eg.addColorStop(0, baseColor+"ee");
      eg.addColorStop(1, baseColor+"88");
      ctx.fillStyle=eg;
      ctx.beginPath();
      ctx.arc(pos.x,pos.y,en.size,0,Math.PI*2);
      ctx.fill();
      ctx.shadowBlur=0;

      // Armor ring
      if(en.armor>0) {
        ctx.strokeStyle="rgba(148,163,184,0.4)";
        ctx.lineWidth=2;
        ctx.beginPath();
        ctx.arc(pos.x,pos.y,en.size+2,0,Math.PI*2);
        ctx.stroke();
      }

      // Emoji icon
      ctx.font=`${en.type==="titan"?18:en.type==="megaboss"?15:en.type==="boss"?13:10}px Arial`;
      ctx.textAlign="center";
      ctx.fillText(def.emoji,pos.x,pos.y-en.size-2);

      // Status icons
      let si=0;
      if(frz){ctx.font="9px Arial";ctx.fillText("❄",pos.x-8+si*9,pos.y+en.size+12);si++;}
      if(psn){ctx.font="9px Arial";ctx.fillText("☠",pos.x-8+si*9,pos.y+en.size+12);si++;}
      if(brn){ctx.font="9px Arial";ctx.fillText("🔥",pos.x-8+si*9,pos.y+en.size+12);si++;}

      // HP bar
      const bw=en.size*3, bh=3.5, bx=pos.x-bw/2, by=pos.y-en.size-12;
      ctx.fillStyle="#0f172a"; ctx.fillRect(bx-1,by-1,bw+2,bh+2);
      const hp=Math.max(0,en.hp/en.maxHp);
      ctx.fillStyle=hp>.6?"#4ade80":hp>.3?"#fbbf24":"#ef4444";
      ctx.fillRect(bx,by,bw*hp,bh);
      if(en.maxShield>0&&en.shield>0){
        ctx.fillStyle="#7dd3fc";
        ctx.fillRect(bx,by-5,bw*(en.shield/en.maxShield),3);
      }
    }

    // ── Projectiles ──
    for(const p of g.projs) {
      ctx.shadowColor=p.color; ctx.shadowBlur=12;
      if(p.ptype==="laser") {
        ctx.strokeStyle=p.color; ctx.lineWidth=3;
        ctx.globalAlpha=0.85;
        ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.tx,p.ty); ctx.stroke();
        // Inner beam
        ctx.strokeStyle="#fff"; ctx.lineWidth=1; ctx.globalAlpha=0.4;
        ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.tx,p.ty); ctx.stroke();
        ctx.globalAlpha=1;
      } else if(p.ptype==="orbital") {
        ctx.strokeStyle=p.color; ctx.lineWidth=2;
        ctx.beginPath(); ctx.arc(p.x,p.y,8,0,Math.PI*2); ctx.stroke();
      } else {
        ctx.fillStyle=p.color;
        ctx.globalAlpha=0.28;
        for(let i=1;i<5;i++){
          const dx=p.tx-p.x,dy=p.ty-p.y,d=Math.sqrt(dx*dx+dy*dy)||1;
          ctx.beginPath();
          ctx.arc(p.x-(dx/d)*i*4,p.y-(dy/d)*i*4,(p.size||4)*(1-i*0.18),0,Math.PI*2);
          ctx.fill();
        }
        ctx.globalAlpha=1;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size||4,0,Math.PI*2); ctx.fill();
      }
      ctx.shadowBlur=0;
    }

    // ── Particles ──
    for(const p of g.parts){
      ctx.globalAlpha=Math.max(0,p.life/p.maxLife);
      ctx.shadowColor=p.color; ctx.shadowBlur=4;
      ctx.fillStyle=p.color;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1; ctx.shadowBlur=0;

    // ── Floating texts ──
    ctx.textAlign="center";
    for(const f of g.floats){
      ctx.globalAlpha=Math.max(0,f.life/1.2);
      ctx.font=`bold 12px Inter,sans-serif`;
      ctx.shadowColor=f.color; ctx.shadowBlur=8;
      ctx.fillStyle=f.color;
      ctx.fillText(f.text,f.x,f.y);
    }
    ctx.globalAlpha=1; ctx.shadowBlur=0;

    // ── Boss warning ──
    if(g.bossWarning>0) {
      const a=Math.min(0.9,g.bossWarning)*Math.abs(Math.sin(Date.now()*0.005));
      ctx.fillStyle=`rgba(220,38,38,${a*0.7})`;
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle=`rgba(255,80,80,${a})`;
      ctx.font="bold 22px Inter,sans-serif"; ctx.textAlign="center";
      ctx.shadowColor="#ef4444"; ctx.shadowBlur=20;
      ctx.fillText("⚠️ ACHTUNG — BOSS KOMMT!",W/2,H/2);
      ctx.shadowBlur=0;
    }

    // ── Wave info ──
    if(g.waveActive){
      ctx.fillStyle="rgba(34,211,238,0.9)";
      ctx.font="bold 11px Inter,sans-serif"; ctx.textAlign="right";
      ctx.shadowColor="#22d3ee"; ctx.shadowBlur=6;
      ctx.fillText(`Welle ${g.wave}/${TOTAL_WAVES} · ${g.spawnQ.length} ausstehend`,W-8,14);
      ctx.shadowBlur=0;
    }

    // Combo display
    if(g.comboTimer>0&&g.comboKills>=5){
      ctx.font="bold 14px Inter,sans-serif"; ctx.textAlign="left";
      ctx.fillStyle=`rgba(249,115,22,${g.comboTimer/2})`;
      ctx.shadowColor="#f97316"; ctx.shadowBlur=10;
      ctx.fillText(`🔥 COMBO ×${g.comboKills}`,8,H-8);
      ctx.shadowBlur=0;
    }
  }, [hover, placing, selType, mapDef]);

  const tick = useCallback((ts: number) => {
    const rawDt = Math.min((ts-lastT.current)/1000, 0.05);
    lastT.current = ts;
    const g = G.current;
    if(g.gameOver||g.won){draw();return;}
    const dt = rawDt * g.speed;

    if(g.bossWarning>0) g.bossWarning-=dt;
    if(g.comboTimer>0) { g.comboTimer-=dt; if(g.comboTimer<=0) g.comboKills=0; }

    // ── Spawn ──
    if(g.waveActive && g.spawnQ.length>0){
      g.spawnTimer-=dt;
      if(g.spawnTimer<=0){
        const type=g.spawnQ.shift()!;
        const def=ED[type];
        g.enemies.push({ id:g.nid++, pathIdx:0, progress:0, hp:def.hp, maxHp:def.hp, shield:def.shield, maxShield:def.shield, speed:def.spd, baseSpeed:def.spd, frozen:0, poisoned:0, burned:0, slowed:0, reward:def.reward, type, regen:def.regen, flying:def.flying, size:def.sz, armor:def.armor, split:def.split });
        g.spawnTimer = type==="swarm"||type==="drone"?0.2:type==="titan"?1.5:type==="megaboss"?1.2:0.65;
        if(type==="boss"||type==="megaboss"||type==="titan") { g.bossWarning=2; }
      }
    }
    if(g.waveActive&&g.spawnQ.length===0&&g.enemies.length===0){
      g.waveActive=false;
      const bonus=50+g.wave*10;
      g.gold+=bonus;
      float(W/2,H/2-20,`✅ Welle ${g.wave} abgeschlossen! +${bonus}💰`,"#4ade80");
      if(g.wave>=TOTAL_WAVES) { g.won=true; }
      sync();
    }

    // ── Healer ──
    for(const en of g.enemies){
      if(en.type==="healer"){
        const ep=ePos(en);
        for(const ot of g.enemies){
          if(ot.id===en.id) continue;
          if(dist(ep,ePos(ot))<CELL*2.8&&ot.hp<ot.maxHp) ot.hp=Math.min(ot.maxHp,ot.hp+20*dt);
        }
      }
    }

    // ── Move enemies ──
    const rem=new Set<number>();
    for(const en of g.enemies){
      if(en.regen>0){ en.hp=Math.min(en.maxHp,en.hp+en.regen*dt); if(en.maxShield>0) en.shield=Math.min(en.maxShield,en.shield+en.regen*0.5*dt); }
      if(en.frozen>0){en.frozen-=dt;en.speed=en.baseSpeed*0.2;}
      else if(en.slowed>0){en.slowed-=dt;en.speed=en.baseSpeed*0.5;}
      else en.speed=en.baseSpeed;
      if(en.poisoned>0){en.poisoned-=dt;en.hp-=18*dt;if(en.hp<=0){const p=ePos(en);g.score+=en.reward;g.gold+=en.reward;g.kills++;burst(p.x,p.y,"#4ade80",8);rem.add(en.id);continue;}}
      if(en.burned>0){en.burned-=dt;en.hp-=25*dt;if(en.hp<=0){const p=ePos(en);g.score+=en.reward;g.gold+=en.reward;g.kills++;burst(p.x,p.y,"#f97316",10);rem.add(en.id);continue;}}
      en.progress+=en.speed*dt*2.2;
      if(en.progress>=1){en.pathIdx++;en.progress=0;
        if(en.pathIdx>=g.map.length-1){
          const livesLost=en.type==="titan"?8:en.type==="megaboss"?5:en.type==="boss"||en.type==="juggernaut"?3:1;
          g.lives=Math.max(0,g.lives-livesLost);
          float(W/2,50,`-${livesLost}❤️`,"#ef4444");
          rem.add(en.id);
          if(g.lives<=0){g.gameOver=true;sync();}
        }
      }
    }
    g.enemies=g.enemies.filter(en=>!rem.has(en.id));

    // ── Tower shoot ──
    const now=ts;
    for(const t of g.towers){
      const def=TD[t.type]; const s2=towerStats(t.type,t.level);
      const tc={x:(t.x+.5)*CELL,y:(t.y+.5)*CELL};
      const range=s2.range*CELL;

      if(t.type==="oracle"){
        if(now-t.lastShot>=s2.rate/g.speed){
          t.lastShot=now;
          for(const en of g.enemies){ if(dist(tc,ePos(en))<=range) en.slowed=2.5; }
          burst(tc.x,tc.y,"#fb923c",8);
        }
        continue;
      }

      const enInRange=g.enemies.filter(en=>{
        if(en.flying&&t.type==="mortar") return false;
        return dist(tc,ePos(en))<=range;
      });
      if(!enInRange.length) continue;
      enInRange.sort((a,b)=>(b.pathIdx+b.progress)-(a.pathIdx+a.progress));
      const target=enInRange[0];

      if(now-t.lastShot<s2.rate/g.speed) continue;
      t.lastShot=now;
      const epx=ePos(target);
      t.angle=Math.atan2(epx.y-tc.y,epx.x-tc.x);

      if(t.type==="mortar"){
        g.projs.push({id:g.nid++,x:tc.x,y:tc.y,tx:epx.x,ty:epx.y,vx:0,vy:0,dmg:s2.dmg,speed:450,eid:target.id,color:def.color,ptype:"missile",aoe:CELL*1.5,pierce:99,hitIds:new Set(),size:6});
      } else if(t.type==="tesla"){
        let cur:Enemy|undefined=target; let hits=0; const maxChain=2+t.level;
        const chainedIds=new Set<number>();
        while(cur&&hits<maxChain){
          dmgEnemy(cur,s2.dmg,"tesla");
          const cp=ePos(cur);
          burst(cp.x,cp.y,"#c084fc",5);
          cur.slowed=0.8;
          chainedIds.add(cur.id);
          const next=g.enemies.filter(x=>!chainedIds.has(x.id)&&dist(ePos(x),cp)<CELL*2.8)[0];
          hits++;
          cur=next;
        }
      } else if(t.type==="poison"){
        g.projs.push({id:g.nid++,x:tc.x,y:tc.y,tx:epx.x,ty:epx.y,vx:0,vy:0,dmg:s2.dmg,speed:260,eid:target.id,color:def.color,ptype:"poison",aoe:0,pierce:0,hitIds:new Set(),size:5});
      } else if(t.type==="freeze"){
        g.projs.push({id:g.nid++,x:tc.x,y:tc.y,tx:epx.x,ty:epx.y,vx:0,vy:0,dmg:s2.dmg,speed:300,eid:target.id,color:def.color,ptype:"freeze",aoe:0,pierce:0,hitIds:new Set(),size:5});
      } else if(t.type==="laser"){
        g.projs.push({id:g.nid++,x:tc.x,y:tc.y,tx:epx.x,ty:epx.y,vx:0,vy:0,dmg:s2.dmg,speed:9999,eid:target.id,color:def.color,ptype:"laser",aoe:0,pierce:0,hitIds:new Set()});
      } else if(t.type==="nuke"){
        g.projs.push({id:g.nid++,x:tc.x,y:tc.y,tx:epx.x,ty:epx.y,vx:0,vy:0,dmg:s2.dmg,speed:180,eid:target.id,color:def.color,ptype:"missile",aoe:CELL*3.5,pierce:99,hitIds:new Set(),size:8});
      } else {
        const pierce=t.type==="sniper"?1+t.level:0;
        g.projs.push({id:g.nid++,x:tc.x,y:tc.y,tx:epx.x,ty:epx.y,vx:0,vy:0,dmg:s2.dmg,speed:t.type==="sniper"?720:380,eid:target.id,color:def.color,ptype:"bullet",aoe:0,pierce,hitIds:new Set(),size:t.type==="sniper"?3:4});
      }
      if(t.type==="rapid"&&t.level>=3&&enInRange.length>1){
        const t2=enInRange[1]; const ep2=ePos(t2);
        g.projs.push({id:g.nid++,x:tc.x,y:tc.y,tx:ep2.x,ty:ep2.y,vx:0,vy:0,dmg:s2.dmg,speed:380,eid:t2.id,color:def.color,ptype:"bullet",aoe:0,pierce:0,hitIds:new Set(),size:4});
      }
    }

    // ── Move projs ──
    const pr=new Set<number>();
    for(const p of g.projs){
      if(p.ptype==="laser"){aoeHit(p.tx,p.ty,CELL*.4,p.dmg,"laser");burst(p.tx,p.ty,p.color,4);pr.add(p.id);continue;}
      const dx=p.tx-p.x,dy=p.ty-p.y,d=Math.sqrt(dx*dx+dy*dy)||1;
      const spd=p.speed*dt;
      if(d<spd+8){
        if(p.ptype==="missile"&&p.aoe>0){ aoeHit(p.tx,p.ty,p.aoe,p.dmg,"mortar"); burst(p.tx,p.ty,p.color,22,true); float(p.tx,p.ty,"💥","#f97316"); }
        else {
          const en=g.enemies.find(x=>x.id===p.eid);
          if(en){
            const src=p.ptype==="poison"?"poison":p.ptype==="freeze"?"freeze":"bullet";
            dmgEnemy(en,p.dmg,src);
            if(p.ptype==="poison") en.poisoned=3.5;
            if(p.ptype==="freeze") en.frozen=2.2;
            burst(p.tx,p.ty,p.color,4);
            if(p.pierce>0&&!p.hitIds.has(en.id)){
              p.hitIds.add(en.id);
              const nxt=g.enemies.filter(x=>!p.hitIds.has(x.id)&&dist({x:p.tx,y:p.ty},ePos(x))<CELL*1.5)[0];
              if(nxt&&p.hitIds.size<=p.pierce){p.eid=nxt.id;const np=ePos(nxt);p.tx=np.x;p.ty=np.y;continue;}
            }
          }
        }
        pr.add(p.id);
      } else { p.x+=(dx/d)*spd; p.y+=(dy/d)*spd; }
    }
    g.projs=g.projs.filter(p=>!pr.has(p.id));

    for(const p of g.parts){p.x+=p.vx;p.y+=p.vy;p.life-=dt;p.vy+=p.gravity;p.vx*=0.97;}
    g.parts=g.parts.filter(p=>p.life>0);
    for(const f of g.floats){f.y+=f.vy;f.life-=dt;}
    g.floats=g.floats.filter(f=>f.life>0);

    draw();
    animRef.current=requestAnimationFrame(tick);
  },[sync,draw,dmgEnemy,aoeHit]);

  useEffect(()=>{
    lastT.current=performance.now();
    animRef.current=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(animRef.current);
  },[tick]);

  const startWave=()=>{
    const g=G.current; if(g.waveActive||g.gameOver||g.won) return;
    const w=++g.wave;
    g.waveActive=true; g.spawnQ=makeWave(w); g.spawnTimer=0;
    setShowWaveInfo(null);
    sync();
  };

  const previewNextWave=()=>{
    const g=G.current;
    if(g.waveActive||g.gameOver||g.won) return;
    const w=g.wave+1;
    if(w>TOTAL_WAVES) return;
    setShowWaveInfo(makeWave(w));
  };

  const handleClick=(ev: React.MouseEvent<HTMLCanvasElement>)=>{
    const rect=cvs.current!.getBoundingClientRect();
    const col=Math.floor((ev.clientX-rect.left)*(W/rect.width)/CELL);
    const row=Math.floor((ev.clientY-rect.top)*(H/rect.height)/CELL);
    if(col<0||col>=COLS||row<0||row>=ROWS) return;
    const g=G.current;
    if(placing){
      if(g.pathSet.has(`${col},${row}`)) return;
      if(g.towers.find(t=>t.x===col&&t.y===row)) return;
      const cost=TD[selType].cost;
      if(g.gold<cost) return;
      g.gold-=cost; g.towers.push({id:g.nid++,x:col,y:row,type:selType,level:1,lastShot:0,angle:0,xp:0,specialCooldown:0,killCount:0});
      setPlacing(false); sync();
    } else {
      const t=g.towers.find(t=>t.x===col&&t.y===row);
      g.selectedTower=t||null;
      sync();
    }
  };

  const handleMove=(ev: React.MouseEvent<HTMLCanvasElement>)=>{
    const rect=cvs.current!.getBoundingClientRect();
    setHover({x:Math.floor((ev.clientX-rect.left)*(W/rect.width)/CELL),y:Math.floor((ev.clientY-rect.top)*(H/rect.height)/CELL)});
  };

  const handleTouch=(ev: React.TouchEvent<HTMLCanvasElement>)=>{
    ev.preventDefault();
    const touch=ev.touches[0];
    const rect=cvs.current!.getBoundingClientRect();
    const col=Math.floor((touch.clientX-rect.left)*(W/rect.width)/CELL);
    const row=Math.floor((touch.clientY-rect.top)*(H/rect.height)/CELL);
    if(col<0||col>=COLS||row<0||row>=ROWS) return;
    const g=G.current;
    if(placing){
      if(g.pathSet.has(`${col},${row}`)) return;
      if(g.towers.find(t=>t.x===col&&t.y===row)) return;
      const cost=TD[selType].cost;
      if(g.gold<cost) return;
      g.gold-=cost; g.towers.push({id:g.nid++,x:col,y:row,type:selType,level:1,lastShot:0,angle:0,xp:0,specialCooldown:0,killCount:0});
      setPlacing(false); sync();
    } else {
      const t=g.towers.find(t=>t.x===col&&t.y===row);
      g.selectedTower=t||null;
      sync();
    }
  };

  const upgradeTower=()=>{
    const g=G.current; const t=g.selectedTower; if(!t||t.level>=4) return;
    const s2=towerStats(t.type,t.level); const cost=s2.cost;
    if(g.gold<cost) return;
    g.gold-=cost; t.level++;
    const real=g.towers.find(x=>x.id===t.id);
    if(real) real.level=t.level;
    float((t.x+.5)*CELL,(t.y+.5)*CELL,"⬆ UPGRADE!","#fbbf24");
    sync();
  };

  const sellTower=()=>{
    const g=G.current; const t=g.selectedTower; if(!t) return;
    let val=TD[t.type].cost; for(let i=1;i<t.level;i++) val+=TD[t.type].upgCost[i-1]||0;
    g.gold+=Math.floor(val*0.6);
    float((t.x+.5)*CELL,(t.y+.5)*CELL,`+${Math.floor(val*0.6)}💰 Verkauft`,"#4ade80");
    g.towers=g.towers.filter(x=>x.id!==t.id);
    g.selectedTower=null;
    sync();
  };

  const toggleSpeed=()=>{const g=G.current;g.speed=g.speed===1?2:g.speed===2?3:1;sync();};
  const upgCost=selTower?towerStats(selTower.type,selTower.level).cost:0;

  // Lives bar
  const livesPercent = Math.max(0, ui.lives/mapDef.startLives*100);

  return (
    <div style={{padding:"6px 8px",maxWidth:860,margin:"0 auto",fontFamily:"Inter,sans-serif"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
        <button onClick={onBackToMenu} style={{background:"hsl(0 0% 9%)",border:"1px solid hsl(0 0% 16%)",borderRadius:8,padding:"4px 10px",color:"hsl(0 0% 55%)",cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",gap:4}}>
          ← Karten
        </button>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:16}}>{mapDef.emoji}</span>
          <span style={{fontSize:14,fontWeight:800,background:`linear-gradient(90deg,#22d3ee,${mapDef.diffColor})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
            {mapDef.name}
          </span>
          <span style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:`${mapDef.diffColor}22`,border:`1px solid ${mapDef.diffColor}44`,color:mapDef.diffColor,fontWeight:600}}>
            {mapDef.difficulty}
          </span>
        </div>
        <button onClick={()=>setShowGuide(v=>!v)} style={{marginLeft:"auto",background:"hsl(0 0% 10%)",border:"1px solid hsl(0 0% 18%)",borderRadius:6,padding:"3px 10px",color:"hsl(0 0% 55%)",cursor:"pointer",fontSize:12}}>
          {showGuide?"✕":"📖"}
        </button>
      </div>

      {/* Guide */}
      {showGuide&&(
        <div style={{background:"hsl(0 0% 7%)",border:"1px solid hsl(0 0% 14%)",borderRadius:10,padding:"10px 14px",marginBottom:8,fontSize:11,color:"hsl(0 0% 55%)"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <div><strong style={{color:"#22d3ee"}}>Türme</strong><br/>
              🔵 Standard · 🟣 Sniper (Pierce)<br/>🟡 Rapid (2× @ Lv3) · 🔷 Freeze<br/>🟠 Mörser (AoE) · 🔴 Laser (Panzerb.)<br/>🟢 Gift (DoT) · 🔮 Tesla (Kette)<br/>🔶 Oracle (AoE Slow) · ☢️ NUKE
            </div>
            <div><strong style={{color:"#f87171"}}>Gegner</strong><br/>
              🔴 Soldat · 🟠 Läufer · ⚫ Panzer<br/>💀 Boss · 💚 Heiler · 👻 Geist (fly)<br/>🟡 Schwarm · 🛡️ Gepanzert · ⚡ Speed<br/>🛸 Drohne · 🧟 Nekro · 🦾 Jugger<br/>🌀 Phantom · ☠️ MegaBoss · 💥 TITAN
            </div>
            <div><strong style={{color:"#fbbf24"}}>Strategie</strong><br/>
              • Türme upgraden für ×1.45 Dmg<br/>• Oracle + Freeze = maximaler Slow<br/>• Tesla kettet bis zu 5+ Gegner<br/>• Mortar trifft keine fliegenden<br/>• Laser/Sniper ignoriert Schild+Panzer<br/>• Combo kills = Bonus Gold 🔥
            </div>
          </div>
        </div>
      )}

      {/* Wave preview panel */}
      {showWaveInfo&&(
        <div style={{background:"hsl(0 0% 7%)",border:"1px solid hsl(220 60% 20%)",borderRadius:10,padding:"10px 14px",marginBottom:8,fontSize:12}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontWeight:700,color:"#22d3ee"}}>Vorschau Welle {ui.wave+1}</span>
            <button onClick={()=>setShowWaveInfo(null)} style={{background:"none",border:"none",color:"hsl(0 0% 40%)",cursor:"pointer",fontSize:14}}>✕</button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
            {[...new Set(showWaveInfo)].map(type => {
              const count = showWaveInfo.filter(t=>t===type).length;
              return (
                <div key={type} style={{background:"hsl(0 0% 10%)",border:"1px solid hsl(0 0% 16%)",borderRadius:6,padding:"3px 8px",fontSize:11,color:"hsl(0 0% 65%)",display:"flex",alignItems:"center",gap:4}}>
                  <span>{ED[type].emoji}</span>
                  <span style={{fontWeight:600}}>{ED[type].label}</span>
                  <span style={{color:"hsl(0 0% 40%)"}}>×{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats bar */}
      <div style={{background:"hsl(0 0% 7%)",borderRadius:8,padding:"6px 10px",marginBottom:6}}>
        <div style={{display:"flex",gap:10,fontSize:13,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{color:"#fbbf24",fontWeight:700}}>💰 {ui.gold}</span>
          <span style={{color:"#ef4444",fontWeight:700}}>❤️ {ui.lives}</span>
          <span style={{color:"#22d3ee",fontWeight:700}}>🌊 {ui.wave}/{TOTAL_WAVES}</span>
          <span style={{color:"#4ade80",fontWeight:700}}>⭐ {ui.score.toLocaleString()}</span>
          <span style={{color:"hsl(0 0% 45%)",fontSize:11}}>☠️ {ui.kills}</span>
          <button onClick={toggleSpeed} style={{marginLeft:"auto",background:"hsl(0 0% 10%)",border:`1px solid ${ui.speed>1?"#fbbf24":"hsl(0 0% 18%)"}`,borderRadius:6,padding:"3px 12px",color:ui.speed>1?"#fbbf24":"hsl(0 0% 55%)",cursor:"pointer",fontSize:13,fontWeight:700}}>
            {ui.speed===1?"▶ 1×":ui.speed===2?"⏩ 2×":"⚡ 3×"}
          </button>
        </div>
        {/* Lives bar */}
        <div style={{marginTop:5,height:3,background:"hsl(0 0% 12%)",borderRadius:2}}>
          <div style={{height:"100%",width:`${livesPercent}%`,background:livesPercent>50?"#4ade80":livesPercent>25?"#fbbf24":"#ef4444",borderRadius:2,transition:"width 0.3s ease"}} />
        </div>
      </div>

      {/* Canvas */}
      <div style={{position:"relative",width:"100%",borderRadius:10,overflow:"hidden",border:`1px solid ${mapDef.diffColor}22`}}>
        <canvas ref={cvs} width={W} height={H}
          style={{display:"block",width:"100%",cursor:placing?"crosshair":"pointer",touchAction:"none"}}
          onClick={handleClick}
          onMouseMove={handleMove}
          onMouseLeave={()=>setHover(null)}
          onTouchStart={handleTouch}
        />
        {(ui.gameOver||ui.won)&&(
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.9)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,backdropFilter:"blur(8px)"}}>
            <div style={{fontSize:64}}>{ui.won?"🏆":"💀"}</div>
            <div style={{fontSize:32,fontWeight:900,color:ui.won?"#fbbf24":"#ef4444",letterSpacing:2,textShadow:`0 0 30px ${ui.won?"#fbbf24":"#ef4444"}`}}>
              {ui.won?"SIEG!":"GAME OVER"}
            </div>
            <div style={{color:"hsl(0 0% 65%)",fontSize:14}}>Score: {ui.score.toLocaleString()} · Kills: {ui.kills}</div>
            {ui.won&&<div style={{color:"#fbbf24",fontSize:12}}>Alle {TOTAL_WAVES} Wellen abgeschlossen! 🎉</div>}
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button className="btn-cyan" onClick={()=>{
                const g=G.current;
                Object.assign(g,{towers:[],enemies:[],projs:[],parts:[],floats:[],gold:mapDef.startGold,lives:mapDef.startLives,wave:0,score:0,waveActive:false,spawnQ:[],gameOver:false,won:false,speed:1,kills:0,selectedTower:null,bossWarning:0,comboKills:0,comboTimer:0});
                setSelTower(null); setPlacing(false); sync();
                cancelAnimationFrame(animRef.current);
                lastT.current=performance.now();
                animRef.current=requestAnimationFrame(tick);
              }}>🔄 Nochmal</button>
              <button onClick={onBackToMenu} style={{background:"hsl(0 0% 10%)",border:"1px solid hsl(0 0% 20%)",borderRadius:10,padding:"10px 20px",color:"hsl(0 0% 65%)",cursor:"pointer",fontSize:14,fontWeight:700}}>
                ← Karte wechseln
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div style={{marginTop:8,display:"flex",gap:6}}>
        {/* Tower grid */}
        <div style={{flex:1,display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4}}>
          {(Object.entries(TD) as [TT,typeof TD[TT]][]).map(([type,def])=>(
            <button key={type} onClick={()=>{setSelType(type);setPlacing(true);G.current.selectedTower=null;setSelTower(null);}}
              disabled={ui.gold<def.cost}
              style={{
                background:selType===type&&placing?def.color:"hsl(0 0% 10%)",
                color:selType===type&&placing?"#000":"hsl(0 0% 80%)",
                border:`1px solid ${selType===type?def.color:"hsl(0 0% 16%)"}`,
                borderRadius:7,padding:"5px 4px",cursor:"pointer",fontSize:11,fontWeight:600,
                opacity:ui.gold<def.cost?0.4:1,transition:"all 0.12s",lineHeight:1.3,
                boxShadow:selType===type&&placing?`0 0 10px ${def.color}88`:undefined,
              }}>
              {def.emoji}<br/><span style={{fontSize:10}}>{def.label}</span><br/><span style={{fontSize:9,opacity:.7}}>💰{def.cost}</span>
            </button>
          ))}
        </div>

        {/* Right panel */}
        <div style={{width:144,display:"flex",flexDirection:"column",gap:4}}>
          {selTower?(
            <div style={{background:"hsl(0 0% 9%)",border:`2px solid ${TD[selTower.type].color}55`,borderRadius:10,padding:"8px 10px",fontSize:11}}>
              <div style={{fontWeight:800,color:TD[selTower.type].color,marginBottom:4,display:"flex",alignItems:"center",gap:4}}>
                {TD[selTower.type].emoji} {TD[selTower.type].label}
                <span style={{fontSize:9,background:`${TD[selTower.type].color}22`,borderRadius:4,padding:"1px 5px"}}>Lv{selTower.level}</span>
              </div>
              <div style={{color:"hsl(0 0% 50%)",marginBottom:1,fontSize:10}}>Schaden: <span style={{color:"hsl(0 0% 75%)",fontWeight:600}}>{Math.round(towerStats(selTower.type,selTower.level).dmg)}</span></div>
              <div style={{color:"hsl(0 0% 50%)",marginBottom:4,fontSize:10}}>Kills: <span style={{color:"hsl(0 0% 75%)",fontWeight:600}}>{selTower.killCount}</span></div>
              {selTower.level<4?(
                <button onClick={upgradeTower} disabled={ui.gold<upgCost}
                  style={{width:"100%",background:ui.gold>=upgCost?"linear-gradient(90deg,#fbbf24,#f59e0b)":"hsl(0 0% 15%)",color:ui.gold>=upgCost?"#000":"hsl(0 0% 40%)",border:"none",borderRadius:7,padding:"6px",cursor:"pointer",fontSize:11,fontWeight:800,marginTop:2}}>
                  ⬆ Lv{selTower.level+1} · 💰{upgCost}
                </button>
              ):<div style={{color:"#4ade80",fontSize:10,textAlign:"center",marginTop:4,fontWeight:700}}>✨ MAX LEVEL</div>}
              <button onClick={sellTower}
                style={{width:"100%",background:"transparent",border:"1px solid hsl(0 60% 45%)",borderRadius:6,padding:"4px",cursor:"pointer",fontSize:10,color:"hsl(0 60% 65%)",marginTop:4}}>
                💰 Verkaufen (60%)
              </button>
            </div>
          ):(
            <div style={{background:"hsl(0 0% 7%)",border:"1px solid hsl(0 0% 13%)",borderRadius:8,padding:"8px 10px",fontSize:10,color:"hsl(0 0% 30%)",textAlign:"center",flex:1,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1.5}}>
              Turm auswählen & auf Karte setzen
            </div>
          )}

          {/* Action buttons */}
          {!ui.waveActive&&!ui.gameOver&&!ui.won&&(
            <div style={{display:"flex",flexDirection:"column",gap:3}}>
              <button className="btn-cyan" onClick={startWave} style={{width:"100%",fontSize:12,fontWeight:800}}>
                {ui.wave===0?"🚀 Start":`🌊 Welle ${ui.wave+1}`}
                {ui.wave>0&&<span style={{display:"block",fontSize:9,opacity:.7,fontWeight:400}}>+💰{50+(ui.wave)*10}</span>}
              </button>
              {ui.wave+1<=TOTAL_WAVES&&(
                <button onClick={previewNextWave} style={{width:"100%",background:"hsl(0 0% 9%)",border:"1px solid hsl(220 60% 22%)",borderRadius:7,padding:"5px",color:"hsl(220 60% 65%)",cursor:"pointer",fontSize:10}}>
                  👁 Vorschau W{ui.wave+1}
                </button>
              )}
            </div>
          )}
          {ui.waveActive&&(
            <div style={{background:"hsl(0 0% 9%)",border:"1px solid hsl(0 0% 16%)",borderRadius:8,padding:"8px",textAlign:"center",color:"#fbbf24",fontSize:12,fontWeight:700}}>
              ⚔️ Welle {ui.wave} läuft
            </div>
          )}
          {placing&&(
            <button onClick={()=>setPlacing(false)} style={{background:"hsl(0 0% 10%)",border:"1px solid hsl(0 0% 18%)",borderRadius:7,padding:"5px",color:"hsl(0 0% 55%)",cursor:"pointer",fontSize:11}}>✕ Abbruch</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  ROOT EXPORT
// ═══════════════════════════════════════════════════════════
export default function TowerDefencePage() {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [selectedMap, setSelectedMap] = useState<MapDef|null>(null);

  const handleSelectMap = (map: MapDef) => {
    setSelectedMap(map);
    setPhase("playing");
  };

  const handleBackToMenu = () => {
    setSelectedMap(null);
    setPhase("menu");
  };

  if (phase === "playing" && selectedMap) {
    return <GameCanvas key={selectedMap.id} mapDef={selectedMap} onBackToMenu={handleBackToMenu} />;
  }

  return <MapSelectScreen onSelect={handleSelectMap} />;
}
