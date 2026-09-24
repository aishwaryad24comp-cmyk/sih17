import { useState } from "react";
import { PieChart as PieIcon } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useTheme } from "../../context/ThemeContext";
import SectionHeader from "../shared/SectionHeader";
import CustomTooltip from "../shared/CustomTooltip";
import Skeleton from "../shared/Skeleton";
import { useDepartments, useDepartmentRisk } from "../../hooks/useDashboardData";

export default function DepartmentRiskPanel() {
  const { colors } = useTheme();
  const { data: departments } = useDepartments();
  const [department, setDepartment] = useState("");
  const { data: breakdown, isLoading } = useDepartmentRisk(department);

  const colorFor = { High: colors.risk.high, Medium: colors.risk.medium, Low: colors.risk.low };
  const total = (breakdown || []).reduce((s, d) => s + d.value, 0);

  return (
    <div className="rounded-lg border p-5 h-[340px] flex flex-col" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      <SectionHeader
        index="06"
        eyebrow="DEPARTMENT FILTER"
        title="Department-wise risk distribution"
        icon={PieIcon}
        right={
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="text-xs rounded-md border px-2 py-1.5"
            style={{ borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }}
          >
            <option value="">All departments</option>
            {(departments || []).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        }
      />
      <div className="flex-1 min-h-0 flex items-center gap-4">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : total === 0 ? (
          <div className="w-full text-center text-sm" style={{ color: colors.textMuted }}>
            No projects for this department.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={breakdown}
                dataKey="value"
                nameKey="name"
                innerRadius="45%"
                outerRadius="80%"
                paddingAngle={2}
              >
                {(breakdown || []).map((d) => (
                  <Cell key={d.name} fill={colorFor[d.name]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="middle"
                align="right"
                layout="vertical"
                iconType="circle"
                wrapperStyle={{ fontSize: 12, color: colors.textMuted }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
