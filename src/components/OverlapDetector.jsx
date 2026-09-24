import { useMemo } from 'react'
import { Network, Building2, Users, CalendarClock } from 'lucide-react'
import { overlapReport, META } from '../data/deriveInsights'
import ModuleHeader from './ModuleHeader'

export default function OverlapDetector({ projects }) {
  const clusters = useMemo(() => overlapReport(projects), [projects])

  return (
    <div className="h-full overflow-y-auto">
      <ModuleHeader
        icon={Network}
        title="Cross-Ministry Overlap Detector"
        description={`Flags districts where two or more departments are acquiring land within a ${META.overlapWindowDays}-day window of each other — the pattern behind repeated displacement and cumulative resentment across parallel Railways / Highways / Power / Metro projects in the same villages.`}
        count={clusters.length}
        countLabel="districts flagged"
      />

      <div className="grid grid-cols-1 gap-4 px-6 py-6 md:grid-cols-2">
        {clusters.map((c, i) => (
          <div key={i} className="rounded-lg border border-ink-900/10 bg-paper-50 p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="font-display text-base font-semibold text-ink-900">{c.district}</div>
                <div className="text-xs text-slate-450">{c.state}</div>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-vermilion-500/10 px-2.5 py-1 font-mono text-xs font-semibold text-vermilion-600">
                <Users size={12} />
                {c.total_families_affected.toLocaleString('en-IN')} families
              </span>
            </div>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {c.departments.map((d) => (
                <span
                  key={d}
                  className="flex items-center gap-1 rounded-full bg-ink-900/5 px-2 py-1 text-[11px] text-ink-700"
                >
                  <Building2 size={11} />
                  {d}
                </span>
              ))}
            </div>

            <div className="space-y-2 border-t border-ink-900/5 pt-3">
              {c.projects.map((p) => (
                <div key={p.project_id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-ink-700">{p.project_id}</span>
                    <span className="text-slate-450">{p.project_type}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-450">
                    <CalendarClock size={12} />
                    {p.notification_date}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {clusters.length === 0 && (
          <div className="col-span-2 px-4 py-8 text-center text-sm text-slate-450">
            No overlapping acquisitions found in the current window.
          </div>
        )}
      </div>
    </div>
  )
}
