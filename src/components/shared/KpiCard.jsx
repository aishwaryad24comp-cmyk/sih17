import { useTheme } from "../../context/ThemeContext";
import Skeleton from "./Skeleton";

export default function KpiCard({ label, value, caption, loading, accent }) {
  const { colors } = useTheme();
  if (loading) {
    return (
      <div className="rounded-lg border p-4" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
        <Skeleton className="h-3 w-20 mb-3" />
        <Skeleton className="h-7 w-16 mb-2" />
        <Skeleton className="h-3 w-28" />
      </div>
    );
  }
  return (
    <div
      className="rounded-lg border p-4"
      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
    >
      <div className="font-mono text-[11px] tracking-widest mb-1" style={{ color: colors.textFaint }}>
        {label}
      </div>
      <div className="text-2xl font-semibold font-slab" style={{ color: accent || colors.text }}>
        {value}
      </div>
      {caption && (
        <div className="text-xs mt-1" style={{ color: colors.textMuted }}>
          {caption}
        </div>
      )}
    </div>
  );
}
