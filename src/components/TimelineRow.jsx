import React from "react";
import { useTheme } from "../context/ThemeContext";

export function TimelineRow({ stage, maxDay }) {
  const { C, bodyFont, monoFont } = useTheme();
  const plannedPct = (stage.planned / maxDay) * 100;
  const actualPct = stage.actual != null ? (stage.actual / maxDay) * 100 : null;
  const overdue = stage.actual != null && stage.actual > stage.planned;
  return (
    <div
      className="group grid grid-cols-12 items-center gap-3 py-2.5 transition-colors duration-150"
      style={{ borderBottom: `1px solid ${C.paperLine}` }}
    >
      <div className="col-span-3" style={{ fontFamily: bodyFont, fontSize: 12.5, color: C.ink }}>{stage.name}</div>
      <div className="col-span-8 relative" style={{ height: 16 }}>
        <div style={{ position: "absolute", inset: 0, background: C.paperDeep, top: 6, height: 4, borderRadius: 2 }} />
        <div
          style={{
            position: "absolute",
            top: 6,
            height: 4,
            borderRadius: 2,
            left: 0,
            width: `${Math.min(plannedPct, 100)}%`,
            background: C.slate,
            opacity: 0.35,
          }}
          className="transition-[width] duration-700 ease-out"
        />
        <div
          title={`Planned day ${stage.planned}`}
          style={{ position: "absolute", left: `${plannedPct}%`, top: 0, width: 2, height: 16, background: C.slate }}
          className="transition-[left] duration-700 ease-out"
        />
        {actualPct != null && (
          <div
            title={`Actual day ${stage.actual}`}
            style={{
              position: "absolute",
              left: `${Math.min(actualPct, 100)}%`,
              top: 2,
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: overdue ? C.high : C.low,
              transform: "translateX(-4px)",
              boxShadow: `0 0 0 2px ${C.card}`,
            }}
            className="transition-[left] duration-700 ease-out group-hover:scale-125"
          />
        )}
      </div>
      <div className="col-span-1 text-right" style={{ fontFamily: monoFont, fontSize: 11, color: overdue ? C.high : C.slateLight }}>
        {stage.actual != null ? (overdue ? `+${stage.actual - stage.planned}d` : "on time") : "—"}
      </div>
    </div>
  );
}
