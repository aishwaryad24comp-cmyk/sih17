import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { riskTier, TIER_COLOR, META } from '../data/deriveInsights'
import RiskBadge from './RiskBadge'
import ProjectDrawer from './ProjectDrawer'

const INDIA_CENTER = [22.9734, 78.6569]
// Bounding box around India (with a small margin) so the map can't be panned
// or zoomed out to show the rest of the world.
const INDIA_BOUNDS = [
  [6.0, 66.0], // southwest
  [37.5, 99.0], // northeast
]

function pinIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div class="file-pin"><div class="file-pin__body" style="background:${color}"><div class="file-pin__dot"></div></div></div>`,
    iconSize: [22, 28],
    iconAnchor: [4, 26],
    popupAnchor: [6, -22],
  })
}

const ICONS = {
  High: pinIcon(TIER_COLOR.High),
  Medium: pinIcon(TIER_COLOR.Medium),
  Low: pinIcon(TIER_COLOR.Low),
}

export default function GISMap({ projects, onRefresh }) {
  const [tierFilter, setTierFilter] = useState({ High: true, Medium: true, Low: true })
  const [stateFilter, setStateFilter] = useState('All')
  const [selectedId, setSelectedId] = useState(null)

  const selectedProject = useMemo(() => {
    return projects.find(p => p.project_id === selectedId) || null
  }, [projects, selectedId])

  const visible = useMemo(() => {
    return projects.filter((p) => {
      // Guard against missing coordinates to prevent Leaflet crash
      if (p.latitude == null || p.longitude == null) return false;
      
      const tier = p.risk
      if (!tierFilter[tier]) return false
      if (stateFilter !== 'All' && p.state !== stateFilter) return false
      return true
    })
  }, [projects, tierFilter, stateFilter])

  const counts = useMemo(() => {
    const c = { High: 0, Medium: 0, Low: 0 }
    for (const p of projects) c[p.risk]++
    return c
  }, [projects])

  return (
    <div className="relative flex h-full flex-col">
      <div className="z-[900] flex flex-wrap items-center gap-3 border-b border-ink-900/10 bg-paper-50 px-6 py-3">
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-450">
          {visible.length} of {projects.length} shown
        </span>
        <div className="flex gap-1.5">
          {(['High', 'Medium', 'Low']).map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter((f) => ({ ...f, [tier]: !f[tier] }))}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-opacity ${
                tierFilter[tier] ? 'opacity-100' : 'opacity-35'
              }`}
              style={{ borderColor: TIER_COLOR[tier], color: TIER_COLOR[tier] }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TIER_COLOR[tier] }} />
              {tier} ({counts[tier]})
            </button>
          ))}
        </div>
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="ml-auto rounded border border-ink-900/15 bg-paper-50 px-2.5 py-1.5 text-xs text-ink-800"
        >
          <option value="All">All states</option>
          {META.states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="relative flex-1">
        <MapContainer
          center={INDIA_CENTER}
          zoom={5}
          minZoom={5}
          maxZoom={12}
          maxBounds={INDIA_BOUNDS}
          maxBoundsViscosity={1.0}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {visible.map((p) => (
            <Marker
              key={p.project_id}
              position={[p.latitude, p.longitude]}
              icon={ICONS[p.risk]}
              eventHandlers={{ click: () => setSelectedId(p.project_id) }}
            >
              <Popup>
                <div className="p-3">
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-slate-450">
                    {p.project_id}
                  </div>
                  <div className="mb-2 font-display text-sm font-semibold text-ink-900">
                    {p.district}, {p.state}
                  </div>
                  <div className="mb-2 text-xs text-ink-700">
                    {p.project_type} · {p.implementing_department}
                  </div>
                  <RiskBadge tier={p.risk} pct={p.predicted_risk_pct} />
                  <button
                    onClick={() => setSelectedId(p.project_id)}
                    className="mt-3 block w-full rounded bg-ink-950 px-2 py-1.5 text-center text-xs font-medium text-paper-50 hover:bg-ink-800"
                  >
                    Open case file
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <ProjectDrawer project={selectedProject} projects={projects} onClose={() => setSelectedId(null)} onRefresh={onRefresh} />
      </div>
    </div>
  )
}
