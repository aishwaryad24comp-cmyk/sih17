import React from "react";
import { useTheme } from "../context/ThemeContext";

export function SectionHeader({ eyebrow, title, icon: Icon }) {
  const { C, displayFont, monoFont } = useTheme();
  return (
    <div className="flex items-baseline gap-3 mb-4">
      <Icon size={16} color={C.brass} strokeWidth={1.75} />
      <div>
        <div style={{ fontFamily: monoFont, fontSize: 10, letterSpacing: "0.16em", color: C.brass }} className="uppercase">
          {eyebrow}
        </div>
        <h2 style={{ fontFamily: displayFont, fontSize: 19, color: C.ink }}>{title}</h2>
      </div>
    </div>
  );
}
