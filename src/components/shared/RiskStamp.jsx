import { useTheme } from "../../context/ThemeContext";

export default function RiskStamp({ level, size = "sm" }) {
  const { colors } = useTheme();
  const map = {
    High: { fg: colors.risk.high, bg: colors.risk.highBg },
    Medium: { fg: colors.risk.medium, bg: colors.risk.mediumBg },
    Low: { fg: colors.risk.low, bg: colors.risk.lowBg },
  };
  const c = map[level] || map.Low;
  const pad = size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-[11px]";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-mono font-semibold tracking-wide ${pad}`}
      style={{ color: c.fg, backgroundColor: c.bg }}
    >
      {level?.toUpperCase()} RISK
    </span>
  );
}
