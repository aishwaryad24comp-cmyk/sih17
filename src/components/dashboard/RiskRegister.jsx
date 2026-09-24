import { useMemo, useState } from "react";
import { ClipboardList, MapPin, Search } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import SectionHeader from "../shared/SectionHeader";
import RiskStamp from "../shared/RiskStamp";
import Skeleton from "../shared/Skeleton";

const FILTERS = ["All", "High", "Medium", "Low"];

export default function RiskRegister({ projects, loading, selectedId, onSelect }) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!projects) return [];
    let result = projects;
    
    if (filter !== "All") {
      result = result.filter((p) => p.riskLevel === filter);
    }
    
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          (p.id?.toLowerCase() || "").includes(q) ||
          (p.state?.toLowerCase() || "").includes(q) ||
          (p.district?.toLowerCase() || "").includes(q) ||
          (p.projectType?.toLowerCase() || "").includes(q)
      );
    }
    
    return result;
  }, [projects, filter, search]);

  return (
    <div className="rounded-lg border flex flex-col h-[520px]" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <div className="p-5 pb-3">
        <SectionHeader index="01" eyebrow="REGISTER" title="Risk categorization" icon={ClipboardList} />
        <div className="flex flex-col gap-3 mt-1">
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1 rounded-md text-xs font-mono font-medium tracking-wide transition-colors"
              style={{
                backgroundColor: filter === f ? colors.text : "transparent",
                color: filter === f ? colors.surface : colors.textMuted,
                border: `1px solid ${filter === f ? colors.text : colors.border}`,
              }}
            >
              {f.toUpperCase()}
            </button>
          ))}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: colors.textMuted }} />
            <input 
              type="text" 
              placeholder="Search by ID, type, state, or district..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs rounded-md pl-8 pr-3 py-1.5 outline-none transition-colors"
              style={{
                backgroundColor: "transparent",
                color: colors.text,
                border: `1px solid ${colors.border}`,
              }}
            />
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 pb-5">
        {loading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full mb-2" />)}
        {!loading &&
          filtered.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className="w-full text-left flex items-center justify-between gap-3 py-3 border-b last:border-0 transition-colors"
              style={{
                borderColor: colors.border,
                backgroundColor: selectedId === p.id ? colors.accentSoft : "transparent",
              }}
            >
              <div className="min-w-0">
                <div className="font-medium text-sm truncate" style={{ color: colors.text }}>
                  {p.projectType}
                </div>
                <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: colors.textMuted }}>
                  <MapPin size={11} />
                  {p.district}, {p.state} · {p.id} ·{" "}
                  {p.overallDelayDays >= 0 ? `+${p.overallDelayDays}d` : `${p.overallDelayDays}d`}
                </div>
              </div>
              <RiskStamp level={p.riskLevel} />
            </button>
          ))}
        {!loading && filtered.length === 0 && (
          <div className="text-sm py-8 text-center" style={{ color: colors.textMuted }}>
            No projects match this filter.
          </div>
        )}
      </div>
    </div>
  );
}
