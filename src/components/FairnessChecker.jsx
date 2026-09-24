import { useMemo, useState } from 'react';
import { Scale } from 'lucide-react';
import { fairnessGapReport, META } from '../data/deriveInsights';
import ModuleHeader from './ModuleHeader';
import { useTheme } from '../context/ThemeContext';

export default function FairnessChecker({ projects }) {
  const { colors } = useTheme();
  const rows = useMemo(() => fairnessGapReport(projects), [projects]);
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (sortDesc ? b.gap_pct - a.gap_pct : a.gap_pct - b.gap_pct)),
    [rows, sortDesc],
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <ModuleHeader
        icon={Scale}
        title="Fairness-Gap Checker"
        description={`Flags offers ≥${META.fairnessGapThresholdPct}% below their own district's average compensation rate — the strongest predictor of litigation-driving disputes, per the Rights & Resources Initiative finding that unfair-compensation perception (not delay) drives ~18% of all stalled projects.`}
        count={rows.length}
        countLabel="projects flagged"
      />

      <div className="px-6 py-6">
        <div className="overflow-hidden rounded-lg border shadow-sm" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: colors.surfaceMuted, borderBottom: `1px solid ${colors.border}` }}>
                <Th colors={colors}>Project</Th>
                <Th colors={colors}>Location</Th>
                <Th colors={colors}>Department</Th>
                <Th
                  colors={colors}
                  onClick={() => setSortDesc((s) => !s)}
                  className="cursor-pointer select-none font-bold"
                  style={{ color: colors.accent }}
                >
                  Gap vs. district avg {sortDesc ? '↓' : '↑'}
                </Th>
                <Th colors={colors}>Offer / District avg (₹ per ha)</Th>
                <Th colors={colors}>Legal disputes</Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr
                  key={r.project_id}
                  className="transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{
                    backgroundColor: i % 2 === 1 ? colors.surfaceMuted : 'transparent',
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  <Td colors={colors} className="font-mono font-semibold" style={{ color: colors.text }}>
                    {r.project_id}
                  </Td>
                  <Td colors={colors} style={{ color: colors.text }}>
                    {r.district}, {r.state}
                  </Td>
                  <Td colors={colors} style={{ color: colors.textMuted }}>
                    {r.implementing_department}
                  </Td>
                  <Td colors={colors}>
                    <span
                      className="rounded-full px-2 py-0.5 font-mono text-[11px] font-bold"
                      style={{ backgroundColor: colors.risk.highBg, color: colors.risk.high }}
                    >
                      -{r.gap_pct}%
                    </span>
                  </Td>
                  <Td colors={colors} className="font-mono" style={{ color: colors.text }}>
                    ₹{r.offer_rate_per_hectare.toLocaleString('en-IN')} / ₹
                    {r.district_avg_rate_per_hectare.toLocaleString('en-IN')}
                  </Td>
                  <Td colors={colors}>
                    <span
                      className="font-bold"
                      style={{ color: r.legal_disputes_count > 0 ? colors.risk.high : colors.textMuted }}
                    >
                      {r.legal_disputes_count}
                    </span>
                  </Td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-xs" style={{ color: colors.textMuted }}>
                    No fairness gaps above threshold in the current dataset.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Th({ children, className = '', onClick, colors, style }) {
  return (
    <th
      onClick={onClick}
      className={`px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-left ${className}`}
      style={{ color: colors.textFaint, ...style }}
    >
      {children}
    </th>
  );
}

function Td({ children, className = '', colors, style }) {
  return (
    <td className={`px-4 py-3 align-middle ${className}`} style={{ color: colors.text, ...style }}>
      {children}
    </td>
  );
}
