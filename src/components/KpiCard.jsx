import React from "react";
import { useTheme } from "../context/ThemeContext";
import { useCountUp } from "../hooks/useCountUp";
import { Skeleton } from "./Skeleton";

export function KpiCard({ icon: Icon, label, value, sub, accent, loading = false }) {
  const { C, displayFont, bodyFont, monoFont } = useTheme();
  const accentColor = accent ?? C.slate;
  const animatedValue = useCountUp(value);

  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.paperLine}`,
        borderTop: `3px solid ${accentColor}`,
      }}
      className="group relative p-4 flex flex-col gap-2 overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_10px_24px_-8px_rgba(0,0,0,0.45)]"
    >
      {/* soft accent glow that reveals on hover */}
      <div
        aria-hidden="true"
        style={{ background: accentColor }}
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-25"
      />
      <div className="relative flex items-center justify-between">
        <span style={{ fontFamily: monoFont, fontSize: 10, letterSpacing: "0.14em", color: C.slateLight }} className="uppercase">
          {label}
        </span>
        <div
          style={{ background: `${accentColor}26`, border: `1px solid ${accentColor}55` }}
          className="flex items-center justify-center rounded-full p-1.5 transition-transform duration-200 group-hover:scale-110 group-hover:rotate-6"
        >
          <Icon size={14} color={accentColor} strokeWidth={1.75} />
        </div>
      </div>
      {loading ? (
        <Skeleton style={{ height: 30, width: "60%" }} />
      ) : (
        <div style={{ fontFamily: displayFont, fontSize: 30, color: C.ink, lineHeight: 1 }} className="relative tabular-nums">
          {animatedValue}
        </div>
      )}
      <div style={{ fontFamily: bodyFont, fontSize: 11.5, color: C.slateLight }} className="relative">
        {sub}
      </div>
    </div>
  );
}
