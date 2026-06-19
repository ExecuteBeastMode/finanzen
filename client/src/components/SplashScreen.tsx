/**
 * SplashScreen — Bootup Animation für Life OS
 * Cross-browser kompatibel (Chrome, Firefox, Safari, Mobile)
 */
import { useEffect, useRef, useState } from "react";

interface Props {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: Props) {
  const [phase, setPhase] = useState(0);
  // 0 = hidden, 1 = logo in, 2 = bar running, 3 = bar full + text, 4 = fade out
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 80),
      setTimeout(() => setPhase(2), 650),
      setTimeout(() => setPhase(3), 1500),
      setTimeout(() => setPhase(4), 2200),
      setTimeout(() => doneRef.current(), 2850),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const visible = phase >= 1;
  const barRunning = phase >= 2;
  const barFull = phase >= 3;
  const fadingOut = phase === 4;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transition: fadingOut ? "opacity 0.6s ease" : "none",
        opacity: fadingOut ? 0 : 1,
        pointerEvents: fadingOut ? "none" : "all",
        userSelect: "none",
      }}
    >
      {/* Grain texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.04,
          pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "180px 180px",
        }}
      />

      {/* ── LOGO CONTAINER ─────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          width: 110,
          height: 110,
          marginBottom: 32,
          transition: "opacity 0.5s ease, transform 0.5s ease",
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(0.8)",
        }}
      >
        {/* Outer pulse ring 1 */}
        <div
          style={{
            position: "absolute",
            inset: -14,
            borderRadius: "50%",
            border: "1px solid rgba(74,222,128,0.12)",
            animation: barRunning ? "lifeosRing1 2.2s ease-out infinite" : "none",
          }}
        />
        {/* Outer pulse ring 2 */}
        <div
          style={{
            position: "absolute",
            inset: -28,
            borderRadius: "50%",
            border: "1px solid rgba(74,222,128,0.06)",
            animation: barRunning ? "lifeosRing1 2.2s ease-out infinite 0.7s" : "none",
          }}
        />

        {/* Main SVG logo — keine CSS transform auf SVG-Kindelemente */}
        <svg viewBox="0 0 110 110" width="110" height="110" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Outer faint circle */}
          <circle cx="55" cy="55" r="50" stroke="rgba(74,222,128,0.14)" strokeWidth="1" />

          {/* Mid ring */}
          <circle
            cx="55"
            cy="55"
            r="33"
            stroke="rgba(74,222,128,0.55)"
            strokeWidth="1.5"
            fill="rgba(74,222,128,0.07)"
            strokeDasharray="207.3"
            strokeDashoffset={visible ? "0" : "207.3"}
            style={{
              transition: "stroke-dashoffset 0.75s cubic-bezier(0.4,0,0.2,1) 0.1s",
              /* rotate via SVG attribute below, not CSS transform */
            }}
            transform="rotate(-90 55 55)"
          />

          {/* Rotating scan line — CSS animation on the whole group */}
          {barRunning && (
            <g style={{ transformOrigin: "55px 55px", animation: "lifeosSpin 2s linear infinite" }}>
              <line x1="55" y1="55" x2="55" y2="5" stroke="rgba(74,222,128,0.5)" strokeWidth="1" strokeLinecap="round" />
            </g>
          )}

          {/* Inner dot */}
          <circle
            cx="55"
            cy="55"
            r="9"
            fill="#4ade80"
            style={{
              transition: "opacity 0.4s ease 0.45s, r 0.4s ease",
              opacity: visible ? 1 : 0,
            }}
          />
          {/* Core */}
          <circle
            cx="55"
            cy="55"
            r="3.5"
            fill="#0a0a0a"
            style={{ opacity: visible ? 1 : 0, transition: "opacity 0.4s ease 0.55s" }}
          />
        </svg>
      </div>

      {/* ── APP NAME ─────────────────────────────────────────────────────── */}
      <div
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "1.65rem",
          fontWeight: 700,
          letterSpacing: "-0.035em",
          color: "#e8e8e8",
          marginBottom: 6,
          transition: "opacity 0.5s ease 0.25s, transform 0.5s ease 0.25s",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(10px)",
        }}
      >
        Life <span style={{ color: "#4ade80" }}>OS</span>
      </div>

      {/* ── SUBTITLE ─────────────────────────────────────────────────────── */}
      <div
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "0.6rem",
          fontWeight: 500,
          letterSpacing: "0.2em",
          color: "#333",
          textTransform: "uppercase",
          marginBottom: 44,
          transition: "opacity 0.5s ease 0.5s",
          opacity: barRunning ? 1 : 0,
        }}
      >
        Personal Dashboard
      </div>

      {/* ── PROGRESS BAR ─────────────────────────────────────────────────── */}
      <div
        style={{
          width: 170,
          height: 2,
          borderRadius: 2,
          background: "#141414",
          overflow: "hidden",
          transition: "opacity 0.4s ease 0.4s",
          opacity: barRunning ? 1 : 0,
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 2,
            background: "linear-gradient(90deg, rgba(74,222,128,0.35) 0%, #4ade80 100%)",
            boxShadow: "0 0 10px rgba(74,222,128,0.55)",
            width: barFull ? "100%" : barRunning ? "62%" : "0%",
            transition: barFull
              ? "width 0.45s cubic-bezier(0.4,0,0.2,1)"
              : barRunning
              ? "width 0.8s cubic-bezier(0.4,0,0.2,1)"
              : "none",
          }}
        />
      </div>

      {/* ── STATUS TEXT ──────────────────────────────────────────────────── */}
      <div
        style={{
          marginTop: 13,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "0.58rem",
          letterSpacing: "0.14em",
          color: "#2a2a2a",
          textTransform: "uppercase",
          transition: "opacity 0.35s ease",
          opacity: barFull && !fadingOut ? 1 : 0,
          minHeight: 16,
        }}
      >
        System bereit
      </div>

      {/* ── KEYFRAMES ────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes lifeosSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes lifeosRing1 {
          0%   { transform: scale(1);    opacity: 0.7; }
          100% { transform: scale(1.5);  opacity: 0; }
        }
      `}</style>
    </div>
  );
}
