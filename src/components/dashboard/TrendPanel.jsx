import { GitBranch } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useTheme } from "../../context/ThemeContext";
import SectionHeader from "../shared/SectionHeader";
import CustomTooltip from "../shared/CustomTooltip";
import Skeleton from "../shared/Skeleton";

export default function TrendPanel({ data, loading }) {
  const { colors } = useTheme();
  return (
    <div className="rounded-lg border p-5 h-[340px] flex flex-col" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <SectionHeader index="03" eyebrow="TREND" title="Risk trend by month" icon={GitBranch} />
      <div className="flex-1 min-h-0">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: -20, top: 4, right: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="highGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.risk.high} stopOpacity={0.32} />
                  <stop offset="95%" stopColor={colors.risk.high} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="mediumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.risk.medium} stopOpacity={0.24} />
                  <stop offset="95%" stopColor={colors.risk.medium} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="lowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.risk.low} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={colors.risk.low} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} vertical={false} />
              <XAxis dataKey="month" tick={{ fill: colors.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: colors.textMuted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                label={{ value: "Projects flagged", angle: -90, position: "insideLeft", fill: colors.textFaint, fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                height={28}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: colors.textMuted }}
              />
              {/* Each risk band gets its own fill + dots so all three are
                  readable at a glance, instead of only the High band being
                  shaded while Medium/Low sat as unlabeled thin lines. */}
              <Area type="monotone" dataKey="High" name="High risk" stroke={colors.risk.high} fill="url(#highGrad)" strokeWidth={2.5} dot={{ r: 3, fill: colors.risk.high, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="Medium" name="Medium risk" stroke={colors.risk.medium} fill="url(#mediumGrad)" strokeWidth={2} dot={{ r: 3, fill: colors.risk.medium, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              <Area type="monotone" dataKey="Low" name="Low risk" stroke={colors.risk.low} fill="url(#lowGrad)" strokeWidth={2} dot={{ r: 3, fill: colors.risk.low, strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
