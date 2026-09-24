import React from "react";
import { useTheme } from "../context/ThemeContext";
import { riskColor, riskBg } from "../theme/tokens";

export function RiskStamp({ risk }) {
  const { C, monoFont } = useTheme();
  const rotation = risk === "High" ? "-6deg" : risk === "Medium" ? "3deg" : "-2deg";
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: monoFont,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.12em",
        color: riskColor(C, risk),
        border: `1.5px solid ${riskColor(C, risk)}`,
        borderRadius: 3,
        padding: "2px 7px",
        transform: `rotate(${rotation})`,
        background: riskBg(C, risk),
        textTransform: "uppercase",
      }}
    >
      {risk} risk
    </span>
  );
}
