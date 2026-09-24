import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "../../context/ThemeContext";
import SectionHeader from "../shared/SectionHeader";
import CustomTooltip from "../shared/CustomTooltip";
import Skeleton from "../shared/Skeleton";
import { useProgressByStage } from "../../hooks/useDashboardData";

export default function ProgressFilterPanel() {
  const { colors } = useTheme();
  const { data, isLoading } = useProgressByStage();
  const [view, setView] = useState("bar");

  return (
    <div className="rounded-lg border p-5 h-[380px] flex flex-col" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <SectionHeader
        index="07"
        eyebrow="PROGRESS FILTERS"
        title="Projects completed by lifecycle stage"
        icon={SlidersHorizontal}
        right={
          <div className="flex gap-1">
            {["bar", "line"].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1 rounded-md text-xs font-mono font-medium tracking-wide"
                style={{
                  backgroundColor: view === v ? colors.text : "transparent",
                  color: view === v ? colors.surface : colors.textMuted,
                  border: `1px solid ${view === v ? colors.text : colors.border}`,
                }}
              >
                {v.toUpperCase()}
              </button>
            ))}
          </div>
        }
      />
      <p className="text-xs mb-2" style={{ color: colors.textMuted }}>
        {view === "bar"
          ? "Each bar is every project that has reached this stage, split into on-time vs. overdue."
          : "Total projects completed at each stage vs. how many of those ran overdue."}
      </p>
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ left: -20, top: 4, right: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} vertical={false} />
              <XAxis dataKey="stage" tick={{ fill: colors.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={45} />
              <YAxis
                tick={{ fill: colors.textMuted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                label={{ value: "Number of projects", angle: -90, position: "insideLeft", fill: colors.textFaint, fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                height={24}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: colors.textMuted }}
              />
              {view === "bar" ? (
                <>
                  <Bar dataKey="onTime" name="On time" stackId="a" fill={colors.risk.low} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="overdue" name="Overdue" stackId="a" fill={colors.risk.high} radius={[3, 3, 0, 0]} />
                </>
              ) : (
                <>
                  <Line type="monotone" dataKey="completed" name="Completed" stroke={colors.accent} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="overdue" name="Overdue" stroke={colors.risk.high} strokeWidth={2} dot={{ r: 3 }} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
