import { useTheme } from "../../context/ThemeContext";

export default function CustomTooltip({ active, payload, label }) {
  const { header } = useTheme();
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-lg"
      style={{ backgroundColor: header.bg, borderColor: header.border, color: header.text }}
    >
      {label && <div className="font-mono mb-1" style={{ color: header.textMuted }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
          <span style={{ color: header.textMuted }}>{p.name}:</span>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}
