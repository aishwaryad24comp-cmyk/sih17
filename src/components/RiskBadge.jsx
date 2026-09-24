import { riskTier, TIER_COLOR } from '../data/deriveInsights'

export default function RiskBadge({ tier, pct, showPct = true }) {
  const actualTier = tier || riskTier(pct)
  const color = TIER_COLOR[actualTier]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium font-mono"
      style={{ backgroundColor: `${color}1A`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {actualTier}
      {showPct && pct !== undefined && pct !== null && <span className="opacity-70">· {Number(pct).toFixed(1)}%</span>}
    </span>
  )
}
