import { BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "../../context/ThemeContext";
import SectionHeader from "../shared/SectionHeader";
import CustomTooltip from "../shared/CustomTooltip";
import Skeleton from "../shared/Skeleton";

export default function ComparativePanel({ data, loading }) {
  const { colors } = useTheme();
  const top = (data || []).slice(0, 6);
  return (
    <div className="rounded-lg border p-5 h-[300px] flex flex-col" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <SectionHeader index="04" eyebrow="COMPARATIVE" title="Risk by state (top 6)" icon={BarChart3} />
      <div className="flex-1 min-h-0">
        {loading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top} margin={{ left: -20, top: 4, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.chartGrid} vertical={false} />
              <XAxis dataKey="state" tick={{ fill: colors.textMuted, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={40} />
              <YAxis tick={{ fill: colors.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="High" name="High" stackId="a" fill={colors.risk.high} radius={[0, 0, 0, 0]} />
              <Bar dataKey="Medium" name="Medium" stackId="a" fill={colors.risk.medium} />
              <Bar dataKey="Low" name="Low" stackId="a" fill={colors.risk.low} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
