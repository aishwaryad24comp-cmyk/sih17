import React, { useMemo, useRef, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, Cell,
} from "recharts";
import {
  Search, MapPin, Clock, AlertTriangle, TrendingUp, Stamp as StampIcon,
  Landmark, GitBranch, BarChart3, Activity, Layers, ScrollText,
} from "lucide-react";

import { useTheme } from "./context/ThemeContext";
import { useDashboardData } from "./hooks/useDashboardData";
import { useProjectExplain } from "./hooks/useProjectExplain";
import { RiskStamp } from "./components/RiskStamp";
import { KpiCard } from "./components/KpiCard";
import { SectionHeader } from "./components/SectionHeader";
import { CustomTooltip } from "./components/CustomTooltip";
import { TimelineRow } from "./components/TimelineRow";
import { Skeleton } from "./components/Skeleton";

/* ------------------------------------------------------------------ */
/*  MAIN                                                                */
/*  Member 4 — React Frontend / Dashboard                              */
/*                                                                      */
/*  Data comes from useDashboardData() + useProjectExplain(), which     */
/*  currently serve dummy JSON (src/data/dummyData.js) and will serve  */
/*  the live API transparently once VITE_USE_LIVE_API=true is set —    */
/*  see src/api/landAcquisitionApi.js for the integration seam.        */
/*  Nothing in this file should need to change when that switch        */
/*  happens.                                                            */
/* ------------------------------------------------------------------ */
export default function Dashboard() {
  const { C, HEADER, displayFont, bodyFont, monoFont } = useTheme();

  const {
    projects,
    districtTrend,
    stateComparison,
    projectsLoading,
    trendLoading,
    stateLoading,
    error,
    refetch,
  } = useDashboardData();

  const [selectedId, setSelectedId] = useState(null);
  const [riskFilter, setRiskFilter] = useState("All");
  const [query, setQuery] = useState("");
  const timelineRef = useRef(null);

  // Keep selection in sync once data arrives (dummy mode resolves
  // instantly; live mode won't).
  const activeSelectedId = selectedId ?? projects[0]?.id ?? null;

  // Per-project SHAP drivers — refetches whenever the selection
  // changes, so the radar chart actually reflects the selected
  // dossier instead of a single frozen aggregate.
  const {
    riskFactors,
    loading: explainLoading,
    error: explainError,
    refetch: refetchExplain,
  } = useProjectExplain(activeSelectedId);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchesRisk = riskFilter === "All" || p.risk === riskFilter;
      const matchesQuery =
        query.trim() === "" ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.district.toLowerCase().includes(query.toLowerCase()) ||
        p.state.toLowerCase().includes(query.toLowerCase());
      return matchesRisk && matchesQuery;
    });
  }, [projects, riskFilter, query]);

  const selected = projects.find((p) => p.id === activeSelectedId) ?? null;

  // Bug fix: Math.max(...[]) === -Infinity, which broke the timeline
  // layout whenever a project had an empty stages array. Guard it.
  const maxDay =
    selected && selected.stages.length
      ? Math.max(...selected.stages.map((s) => Math.max(s.planned, s.actual || 0))) + 20
      : 100;

  const counts = {
    High: projects.filter((p) => p.risk === "High").length,
    Medium: projects.filter((p) => p.risk === "Medium").length,
    Low: projects.filter((p) => p.risk === "Low").length,
  };
  const avgDelay = projects.length
    ? Math.round(projects.reduce((s, p) => s + p.delayDays, 0) / projects.length)
    : 0;

  const filtersActive = riskFilter !== "All" || query.trim() !== "";
  const kpiLoading = projectsLoading && projects.length === 0;

  // Only a total failure (no cached data at all) blocks the whole
  // page — a background refetch failure with data already on screen
  // shouldn't blank everything out.
  if (error) {
    return (
      <div style={{ background: C.paper, minHeight: "100%", fontFamily: bodyFont, color: C.high }} className="w-full flex flex-col items-center justify-center gap-3 p-10">
        <span style={{ fontFamily: monoFont, fontSize: 12 }} className="text-center">
          Could not load dashboard data. Check the API connection and try again.
        </span>
        <button
          type="button"
          onClick={refetch}
          style={{ fontFamily: monoFont, fontSize: 11, border: `1px solid ${C.high}`, color: C.high, padding: "6px 14px" }}
          className="uppercase transition-colors duration-150 hover:opacity-80"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: C.paper, minHeight: "100%", fontFamily: bodyFont }} className="w-full transition-colors duration-200">
      {/* subtle grid texture like a cadastral map */}
      <div
        style={{
          backgroundImage: `linear-gradient(${C.paperLine} 1px, transparent 1px), linear-gradient(90deg, ${C.paperLine} 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
          opacity: 0.35,
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
        }}
      />

      {/* HEADER — fixed dark ledger-stamp bar for wayfinding, deliberately a shade darker than the body for hierarchy */}
      <header style={{ background: HEADER.bg, borderBottom: `3px solid ${HEADER.accent}` }} className="sticky top-16 z-40 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div style={{ border: `1.5px solid ${HEADER.accentLight}`, borderRadius: 6 }} className="p-2">
            <Landmark size={20} color={HEADER.accentLight} strokeWidth={1.5} />
          </div>
          <div>
            <div style={{ fontFamily: displayFont, fontSize: 20, color: HEADER.text, letterSpacing: "0.01em" }}>
              PrediXa
            </div>
            <div style={{ fontFamily: monoFont, fontSize: 10, color: HEADER.muted, letterSpacing: "0.14em" }} className="uppercase">
              Predictive Land Acquisition Delay Registry
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div style={{ fontFamily: monoFont, fontSize: 10.5, color: HEADER.accentLight }} className="uppercase tracking-wide hidden md:flex items-center gap-1.5">
            <span className="live-pulse inline-block rounded-full" style={{ width: 6, height: 6, background: HEADER.accentLight }} aria-hidden="true" />
            {import.meta.env?.VITE_USE_LIVE_API === "true" ? "Source: live API" : "Source: dummy_dataset_v0.json · live API pending"}
          </div>
          <div
            style={{ border: `1px solid ${HEADER.border}`, borderRadius: 3 }}
            className="px-2.5 py-1 flex items-center gap-1.5 transition-colors duration-150 focus-within:border-2"
          >
            <Search size={13} color={HEADER.muted} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search project, district, state"
              aria-label="Search projects by name, district, or state"
              style={{ background: "transparent", outline: "none", color: HEADER.text, fontFamily: bodyFont, fontSize: 12.5 }}
              className="w-28 sm:w-40 md:w-48"
            />
          </div>
        </div>
      </header>

      <div className="relative px-4 sm:px-6 py-6 grid grid-cols-12 gap-5 max-w-[1440px] mx-auto">
        {/* KPI ROW */}
        <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={Layers} label="Active dossiers" value={projects.length} sub="Across states & districts" accent={C.slate} loading={kpiLoading} />
          <KpiCard icon={AlertTriangle} label="High risk" value={counts.High} sub={`${counts.Medium} medium · ${counts.Low} low`} accent={C.high} loading={kpiLoading} />
          <KpiCard icon={Clock} label="Avg. delay" value={`${avgDelay}d`} sub="Vs. gazetted schedule" accent={C.medium} loading={kpiLoading} />
          <KpiCard icon={TrendingUp} label="Model confidence" value="91%" sub="Random forest · v2.3, retrained weekly" accent={C.low} />
        </div>

        {/* RISK CATEGORIZATION */}
        <div className="col-span-12 lg:col-span-5">
          <div style={{ background: C.card, border: `1px solid ${C.paperLine}` }} className="p-5 h-full transition-shadow duration-200 hover:shadow-[0_10px_28px_-10px_rgba(0,0,0,0.4)]">
            <SectionHeader eyebrow="01 · Register" title="Risk categorization" icon={StampIcon} />
            <div className="flex gap-2 mb-3" role="group" aria-label="Filter by risk level">
              {["All", "High", "Medium", "Low"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRiskFilter(r)}
                  aria-pressed={riskFilter === r}
                  style={{
                    fontFamily: monoFont,
                    fontSize: 10.5,
                    letterSpacing: "0.08em",
                    padding: "4px 10px",
                    border: `1px solid ${riskFilter === r ? C.ink : C.paperLine}`,
                    background: riskFilter === r ? C.ink : "transparent",
                    color: riskFilter === r ? C.paper : C.slate,
                  }}
                  className="uppercase transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0"
                >
                  {r}
                </button>
              ))}
            </div>

            {kpiLoading ? (
              <div className="flex flex-col gap-2 py-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} style={{ height: 44 }} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col max-h-[50vh] lg:max-h-[380px] overflow-y-auto">
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(p.id);
                      timelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    aria-pressed={activeSelectedId === p.id}
                    aria-label={`View timeline for ${p.name}, ${p.district}, ${p.state}`}
                    style={{
                      textAlign: "left",
                      padding: "10px 8px",
                      borderBottom: `1px solid ${C.paperLine}`,
                      background: activeSelectedId === p.id ? C.paperDeep : "transparent",
                      borderLeft: activeSelectedId === p.id ? `3px solid ${C.brass}` : "3px solid transparent",
                    }}
                    className="transition-all duration-150 hover:pl-3 hover:bg-black/10"
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ fontFamily: bodyFont, fontWeight: 600, fontSize: 13, color: C.ink }}>{p.name}</span>
                      <RiskStamp risk={p.risk} />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1" style={{ fontFamily: monoFont, fontSize: 10.5, color: C.slateLight }}>
                      <MapPin size={11} />
                      {p.district}, {p.state} &nbsp;·&nbsp; {p.id} &nbsp;·&nbsp; +{p.delayDays}d
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="py-6 flex flex-col items-center gap-2">
                    <span style={{ fontFamily: bodyFont, fontSize: 12.5, color: C.slateLight }} className="text-center">
                      No dossiers match this filter.
                    </span>
                    {filtersActive && (
                      <button
                        type="button"
                        onClick={() => {
                          setRiskFilter("All");
                          setQuery("");
                        }}
                        style={{ fontFamily: monoFont, fontSize: 10.5, border: `1px solid ${C.slate}`, color: C.slate, padding: "4px 10px" }}
                        className="uppercase transition-colors duration-150 hover:opacity-80"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RISK FACTOR RADAR (Member 3's SHAP output, per selected project) */}
        <div className="col-span-12 lg:col-span-7">
          <div style={{ background: C.card, border: `1px solid ${C.paperLine}` }} className="p-5 h-full transition-shadow duration-200 hover:shadow-[0_10px_28px_-10px_rgba(0,0,0,0.4)]">
            <SectionHeader eyebrow="02 · Model inputs" title={selected ? `Delay driver composition · ${selected.name}` : "Delay driver composition"} icon={Activity} />
            {explainLoading && riskFactors.length === 0 ? (
              <Skeleton style={{ height: 330 }} />
            ) : explainError ? (
              <div style={{ height: 330, fontFamily: bodyFont, fontSize: 12.5, color: C.slateLight }} className="flex flex-col items-center justify-center gap-2">
                <span>Couldn't load delay drivers for this dossier.</span>
                <button
                  type="button"
                  onClick={() => refetchExplain()}
                  style={{ fontFamily: monoFont, fontSize: 10.5, border: `1px solid ${C.brass}`, color: C.brass, padding: "4px 10px" }}
                  className="uppercase transition-colors duration-150 hover:opacity-80"
                >
                  Retry
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={330}>
                <RadarChart data={riskFactors} outerRadius="72%">
                  <PolarGrid stroke={C.paperLine} />
                  <PolarAngleAxis dataKey="factor" tick={{ fill: C.slate, fontFamily: bodyFont, fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fill: C.slateLight, fontFamily: monoFont, fontSize: 9 }} domain={[0, 100]} />
                  <Radar dataKey="score" stroke={C.high} fill={C.high} fillOpacity={0.18} strokeWidth={1.75} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* DISTRICT DELAY TRENDS */}
        <div className="col-span-12 lg:col-span-7">
          <div style={{ background: C.card, border: `1px solid ${C.paperLine}` }} className="p-5 h-full transition-shadow duration-200 hover:shadow-[0_10px_28px_-10px_rgba(0,0,0,0.4)]">
            <SectionHeader eyebrow="03 · Trend" title="District delay accumulation" icon={GitBranch} />
            {trendLoading && districtTrend.length === 0 ? (
              <Skeleton style={{ height: 280 }} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={districtTrend} margin={{ left: -10, right: 10 }}>
                  <CartesianGrid stroke={C.paperLine} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: C.slate, fontFamily: monoFont, fontSize: 10.5 }} axisLine={{ stroke: C.paperLine }} tickLine={false} />
                  <YAxis tick={{ fill: C.slate, fontFamily: monoFont, fontSize: 10.5 }} axisLine={false} tickLine={false} label={{ value: "days behind", angle: -90, position: "insideLeft", fill: C.slateLight, fontFamily: bodyFont, fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontFamily: bodyFont, fontSize: 11 }} />
                  {districtTrend[0] &&
                    Object.keys(districtTrend[0])
                      .filter((k) => k !== "month")
                      .map((district, i) => (
                        <Line
                          key={district}
                          type="monotone"
                          dataKey={district}
                          stroke={[C.high, C.medium, C.low, C.slate][i % 4]}
                          strokeWidth={2}
                          dot={{ r: 2.5 }}
                        />
                      ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* COMPARATIVE ANALYTICS */}
        <div className="col-span-12 lg:col-span-5">
          <div style={{ background: C.card, border: `1px solid ${C.paperLine}` }} className="p-5 h-full transition-shadow duration-200 hover:shadow-[0_10px_28px_-10px_rgba(0,0,0,0.4)]">
            <SectionHeader eyebrow="04 · Comparative" title="Avg. delay by state" icon={BarChart3} />
            {stateLoading && stateComparison.length === 0 ? (
              <Skeleton style={{ height: 280 }} />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stateComparison} margin={{ left: -20, right: 10 }}>
                  <CartesianGrid stroke={C.paperLine} vertical={false} />
                  <XAxis dataKey="state" tick={{ fill: C.slate, fontFamily: monoFont, fontSize: 10.5 }} axisLine={{ stroke: C.paperLine }} tickLine={false} />
                  <YAxis tick={{ fill: C.slate, fontFamily: monoFont, fontSize: 10.5 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avgDelay" radius={[2, 2, 0, 0]}>
                    {stateComparison.map((s, i) => (
                      <Cell key={i} fill={s.avgDelay > 100 ? C.high : s.avgDelay > 50 ? C.medium : C.low} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* TIMELINE ANALYSIS */}
        <div className="col-span-12" ref={timelineRef}>
          <div style={{ background: C.card, border: `1px solid ${C.paperLine}` }} className="p-5 transition-shadow duration-200 hover:shadow-[0_10px_28px_-10px_rgba(0,0,0,0.4)]">
            {selected ? (
              <>
                <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                  <SectionHeader eyebrow="05 · Case file" title={`Timeline · ${selected.name}`} icon={ScrollText} />
                  <div className="flex items-center gap-2">
                    <RiskStamp risk={selected.risk} />
                    <span style={{ fontFamily: monoFont, fontSize: 11, color: C.slateLight }}>{selected.id}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-3 flex-wrap" style={{ fontFamily: monoFont, fontSize: 10.5, color: C.slateLight }}>
                  <span className="flex items-center gap-1.5"><span style={{ width: 8, height: 2, background: C.slate, display: "inline-block" }} /> planned milestone</span>
                  <span className="flex items-center gap-1.5"><span style={{ width: 8, height: 8, borderRadius: "50%", background: C.high, display: "inline-block" }} /> completed, overdue</span>
                  <span className="flex items-center gap-1.5"><span style={{ width: 8, height: 8, borderRadius: "50%", background: C.low, display: "inline-block" }} /> completed, on time</span>
                </div>
                {selected.stages.length ? (
                  selected.stages.map((s, i) => <TimelineRow key={i} stage={s} maxDay={maxDay} />)
                ) : (
                  <div style={{ fontFamily: bodyFont, fontSize: 12.5, color: C.slateLight }} className="py-6 text-center">
                    No timeline stages recorded for this dossier yet.
                  </div>
                )}
              </>
            ) : (
              <div style={{ fontFamily: bodyFont, fontSize: 12.5, color: C.slateLight }} className="py-6 text-center">
                Select a dossier from the register to view its timeline.
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="relative px-6 py-4 text-center" style={{ fontFamily: monoFont, fontSize: 10, color: C.slateLight, letterSpacing: "0.08em" }}>
        PREDIXA — EARLY DETECTION OF LAND ACQUISITION DELAYS · REACT + RECHARTS + TAILWIND
      </footer>
    </div>
  );
}
