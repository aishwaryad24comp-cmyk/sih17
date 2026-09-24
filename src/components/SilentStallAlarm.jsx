import { useMemo } from 'react'
import { BellRing, Clock } from 'lucide-react'
import { silentStallReport, META } from '../data/deriveInsights'
import ModuleHeader from './ModuleHeader'
import RiskBadge from './RiskBadge'

export default function SilentStallAlarm({ projects }) {
  const rows = useMemo(() => silentStallReport(projects), [projects])

  return (
    <div className="h-full overflow-y-auto">
      <ModuleHeader
        icon={BellRing}
        title="Silent-Stall Alarm"
        description={`Flags projects with no recorded file activity in ${META.stallThresholdDays}+ days — surfacing stalls before an official delay report exists, since manual reporting itself typically takes weeks to months.`}
        count={rows.length}
        countLabel="projects gone quiet"
      />

      <div className="space-y-2 px-6 py-6">
        {rows.map((r) => (
          <div
            key={r.project_id}
            className="flex items-center gap-4 rounded-lg border border-ink-900/10 bg-paper-50 px-4 py-3"
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                r.days_silent >= 45 ? 'bg-vermilion-500/10 text-vermilion-600' : 'bg-marigold-500/10 text-marigold-600'
              }`}
            >
              <Clock size={16} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-slate-450">{r.project_id}</span>
                <span className="text-sm font-medium text-ink-900">
                  {r.district}, {r.state}
                </span>
              </div>
              <div className="text-xs text-slate-450">
                {r.implementing_department} · {r.approval_stage}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div
                className={`font-mono text-sm font-semibold ${
                  r.days_silent >= 45 ? 'text-vermilion-600' : 'text-marigold-600'
                }`}
              >
                {r.days_silent}d silent
              </div>
              <div className="text-[10px] text-slate-450">since {r.last_activity_date}</div>
            </div>

            <RiskBadge tier={r.risk} pct={r.predicted_risk_pct} showPct={false} />
          </div>
        ))}
        {rows.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-slate-450">
            No projects currently silent past the threshold.
          </div>
        )}
      </div>
    </div>
  )
}
