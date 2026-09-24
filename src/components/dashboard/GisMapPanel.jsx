import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Tooltip, CircleMarker, useMap } from "react-leaflet";
import { Map as MapIcon, Maximize2, Minimize2 } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import SectionHeader from "../shared/SectionHeader";
import Skeleton from "../shared/Skeleton";
import { useMapProjects } from "../../hooks/useGisData";

// Center + zoom framed on India, where every dummy district/state sits.
const INDIA_CENTER = [22.9734, 78.6569];
const DEFAULT_ZOOM = 5;

const FILTERS = ["All", "High", "Medium", "Low"];

// Leaflet measures its tile grid off the container's size *at mount time*
// and never re-checks it on its own. Whenever that container resizes for a
// reason Leaflet doesn't know about — entering/exiting the fullscreen
// modal, a browser resize, a sidebar collapsing — the map needs an explicit
// nudge via invalidateSize(), or tiles stay clipped to the old dimensions.
function MapAutosize({ resizeKey }) {
  const map = useMap();

  useEffect(() => {
    // Wait a beat for the fullscreen/collapse CSS transition to settle
    // before asking Leaflet to remeasure its container.
    const id = setTimeout(() => map.invalidateSize(), 260);
    return () => clearTimeout(id);
  }, [resizeKey, map]);

  useEffect(() => {
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [map]);

  return null;
}

// Feature #4 — GIS Map Visualization. Renders the same project list / same
// selection state (`selectedId` + `onSelect`) whether shown inline in the
// dashboard card or expanded to fullscreen — there is exactly one map
// implementation, `isExpanded` only changes how its container is framed.
export default function GisMapPanel({ selectedId, onSelect }) {
  const { colors } = useTheme();
  const { data: projects, isLoading } = useMapProjects();
  const [filter, setFilter] = useState("High");
  const [isExpanded, setIsExpanded] = useState(false);

  // Esc exits fullscreen; lock background scroll while the overlay is open
  // so the page behind it doesn't scroll along with the map.
  useEffect(() => {
    if (!isExpanded) return;
    const onKey = (e) => e.key === "Escape" && setIsExpanded(false);
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isExpanded]);

  const riskColor = {
    High: colors.risk.high,
    Medium: colors.risk.medium,
    Low: colors.risk.low,
  };

  const filtered = useMemo(() => {
    if (!projects) return [];
    if (filter === "All") return projects;
    return projects.filter((p) => p.riskLevel === filter);
  }, [projects, filter]);

  const mapHeightClass = isExpanded
    ? "h-[calc(100vh-200px)]"
    : "h-[380px] sm:h-[440px] lg:h-[480px]";

  const content = (
    <>
      <SectionHeader
        index="08"
        eyebrow="GIS"
        title="High-risk projects, mapped"
        icon={MapIcon}
        right={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-3 py-1 rounded-md text-xs font-mono font-medium tracking-wide transition-colors"
                  style={{
                    backgroundColor: filter === f ? colors.text : "transparent",
                    color: filter === f ? colors.surface : colors.textMuted,
                    border: `1px solid ${filter === f ? colors.text : colors.border}`,
                  }}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsExpanded((v) => !v)}
              title={isExpanded ? "Collapse map" : "Expand map"}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium tracking-wide transition-colors"
              style={{ color: colors.textMuted, border: `1px solid ${colors.border}` }}
            >
              {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              {isExpanded ? "COLLAPSE" : "EXPAND MAP"}
            </button>
          </div>
        }
      />

      {isLoading ? (
        <Skeleton className={`${mapHeightClass} w-full`} />
      ) : (
        <div
          className={`rounded-md overflow-hidden border w-full ${mapHeightClass} relative z-0`}
          style={{ borderColor: colors.border }}
        >
          <MapContainer
            center={INDIA_CENTER}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom
            style={{ height: "100%", width: "100%", backgroundColor: colors.surfaceMuted }}
          >
            <MapAutosize resizeKey={isExpanded} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filtered.map((p) => (
              <CircleMarker
                key={p.id}
                center={[p.lat, p.lng]}
                radius={p.id === selectedId ? 10 : 6}
                pathOptions={{
                  color: riskColor[p.riskLevel] || colors.textMuted,
                  fillColor: riskColor[p.riskLevel] || colors.textMuted,
                  fillOpacity: 0.75,
                  weight: p.id === selectedId ? 3 : 1,
                }}
                eventHandlers={{ click: () => onSelect?.(p.id) }}
              >
                {/* Hover-only compact info card. Clicking still just fires
                    onSelect above — the marker click never opens this. */}
                <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                  <div style={{ fontFamily: "Inter, sans-serif", minWidth: 175 }}>
                    <div style={{ fontWeight: 600, marginBottom: 3 }}>
                      {p.projectType} · {p.id}
                    </div>
                    <div style={{ fontSize: 11, color: "#555", marginBottom: 2 }}>
                      {p.village} · {p.district}, {p.state}
                    </div>
                    <div style={{ fontSize: 11, color: "#555", marginBottom: 4 }}>{p.department}</div>
                    <div style={{ fontSize: 11, marginBottom: 4 }}>
                      Risk score: <strong>{p.riskScore}/100</strong>
                      {typeof p.overallDelayDays === "number" && (
                        <>
                          {" "}
                          · {p.overallDelayDays >= 0 ? `+${p.overallDelayDays}d predicted delay` : `${p.overallDelayDays}d`}
                        </>
                      )}
                    </div>
                    <div
                      style={{
                        display: "inline-block",
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: 4,
                        color: "#fff",
                        backgroundColor: riskColor[p.riskLevel],
                      }}
                    >
                      {p.riskLevel?.toUpperCase()} RISK
                    </div>
                  </div>
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      )}

      <div className="flex items-center gap-4 mt-3 text-xs flex-wrap" style={{ color: colors.textMuted }}>
        {FILTERS.slice(1).map((level) => (
          <span key={level} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: riskColor[level] }}
            />
            {level}
          </span>
        ))}
        <span className="ml-auto font-mono">{filtered.length} project(s) plotted</span>
      </div>
    </>
  );

  if (isExpanded) {
    return (
      <div
        className="fixed inset-0 z-[100] p-4 sm:p-6 overflow-y-auto"
        style={{ backgroundColor: colors.page }}
      >
        <div
          className="rounded-lg border p-5 max-w-[1600px] mx-auto"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-5" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
      {content}
    </div>
  );
}
