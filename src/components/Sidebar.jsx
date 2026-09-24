import { Map, Scale, Network, BellRing, FileStack } from 'lucide-react'

const NAV = [
  { id: 'map', label: 'GIS Risk Map', icon: Map },
  { id: 'fairness', label: 'Fairness-Gap Checker', icon: Scale },
  { id: 'overlap', label: 'Cross-Ministry Overlap', icon: Network },
  { id: 'stall', label: 'Silent-Stall Alarm', icon: BellRing },
]

export default function Sidebar({ active, onNavigate, meta, isLive }) {
  return (
    <aside
      className="flex h-full w-64 shrink-0 flex-col bg-paper-50 text-ink-900 border-r border-ink-900/10"
    >
      {/* Logo / Header */}
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-marigold-500 text-ink-950">
          <FileStack size={18} strokeWidth={2.25} />
        </div>

        <div>
          <div className="font-display text-sm font-semibold leading-tight">
            PrediXa
          </div>

          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-600">
            Land Acquisition Delay Registry
          </div>
        </div>
      </div>

      {/* Section title */}
      <div className="px-5 pb-2 pt-1 font-mono text-[10px] uppercase tracking-wider text-slate-600">
        Risk &amp; Field Intelligence
      </div>

      {/* Navigation */}
      <nav className="mt-1 flex flex-col gap-1 px-3">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
              active === id
                ? 'bg-slate-200 text-ink-900 font-medium'
                : 'text-slate-600 hover:bg-slate-100 hover:text-ink-900'
            }`}
          >
            <Icon
              size={16}
              strokeWidth={2}
              className={
                active === id ? 'text-marigold-500' : 'text-slate-500'
              }
            />

            {label}
          </button>
        ))}
      </nav>

      {/* Bottom information */}
      <div className="mt-auto space-y-3 border-t border-ink-900/10 px-5 py-5">
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isLive ? 'bg-teal-500' : 'bg-marigold-500'
            }`}
          />

          <span className="text-slate-600">
            {isLive ? 'Live gateway' : 'Local dataset'}
          </span>
        </div>

        {meta && (
          <div className="font-mono text-[10px] leading-relaxed text-slate-600">
            {meta.totalProjects} projects · {meta.states.length} states
          </div>
        )}
      </div>
    </aside>
  )
}