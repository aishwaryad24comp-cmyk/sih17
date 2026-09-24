import React from "react";
import { useTheme } from "../context/ThemeContext";

export function CustomTooltip({ active, payload, label }) {
  const { HEADER, monoFont } = useTheme();
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: HEADER.bg, color: HEADER.text, padding: "8px 12px", fontFamily: monoFont, fontSize: 11, border: `1px solid ${HEADER.accent}` }}>
      <div style={{ color: HEADER.accentLight, marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <span>{p.dataKey || p.name}</span>
          <span>{p.value}</span>
        </div>
      ))}
    </div>
  );
}
