import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useProjects, useSummary, useMonthlyTrend, useStateComparison } from "../hooks/useDashboardData";
import KpiCard from "../components/shared/KpiCard";
import RiskRegister from "../components/dashboard/RiskRegister";
import DelayDriverPanel from "../components/dashboard/DelayDriverPanel";
import TimelinePanel from "../components/dashboard/TimelinePanel";
import VerificationPanel from "../components/dashboard/VerificationPanel";
import TrendPanel from "../components/dashboard/TrendPanel";
import ComparativePanel from "../components/dashboard/ComparativePanel";
import DepartmentRiskPanel from "../components/dashboard/DepartmentRiskPanel";
import ProgressFilterPanel from "../components/dashboard/ProgressFilterPanel";
import FairnessChecker from "../components/FairnessChecker";

export default function DashboardPage() {
  const { colors } = useTheme();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: summary, isLoading: summaryLoading } = useSummary();
  const { data: monthlyTrend, isLoading: trendLoading } = useMonthlyTrend();
  const { data: stateComparison, isLoading: comparisonLoading } = useStateComparison();
  const [selectedId, setSelectedId] = useState(null);

  const selectedProject = projects?.find((p) => p.id === selectedId) || null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="TOTAL PROJECTS TRACKED" value={summary?.total ?? "—"} caption="Across states & districts" loading={summaryLoading} />
        <KpiCard
          label="HIGH-RISK PROJECTS"
          value={summary?.high ?? "—"}
          caption={summary ? `${summary.medium} medium · ${summary.low} low` : ""}
          loading={summaryLoading}
          accent={colors.risk.high}
        />
        <KpiCard label="AVG DAYS OVERDUE" value={summary ? `+${summary.avgOverdue}d` : "—"} caption="Vs. gazetted schedule" loading={summaryLoading} />
        <KpiCard label="MODEL VERSION" value="v2.3" caption="Random forest · retrained weekly" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <RiskRegister projects={projects} loading={projectsLoading} selectedId={selectedId} onSelect={setSelectedId} />
        <DelayDriverPanel project={selectedProject} />
      </div>

      {selectedProject?.timeline?.length > 0 && <TimelinePanel project={selectedProject} />}
      {selectedProject && <VerificationPanel project={selectedProject} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TrendPanel data={monthlyTrend} loading={trendLoading} />
        <ComparativePanel data={stateComparison} loading={comparisonLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DepartmentRiskPanel />
        <ProgressFilterPanel />
      </div>

      <FairnessChecker projects={projects} />

      <footer className="text-center py-6 font-mono text-[11px] tracking-widest" style={{ color: colors.textFaint }}>
        PREDIXA — EARLY DETECTION OF LAND ACQUISITION DELAYS · REACT + RECHARTS + TAILWIND
      </footer>
    </div>
  );
}
