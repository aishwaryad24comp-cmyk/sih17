import { useEffect, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useMapProjects } from "../hooks/useGisData";
import GisMapPanel from "../components/dashboard/GisMapPanel";
import OverlapDetectorPanel from "../components/dashboard/OverlapDetectorPanel";
import SilentStallPanel, { SilentStallBell } from "../components/dashboard/SilentStallPanel";
import ProjectDetailsTable from "../components/dashboard/ProjectDetailsTable";
import ProjectDetailModal from "../components/dashboard/ProjectDetailModal";
import SectionHeader from "../components/shared/SectionHeader";
import { MapPinned } from "lucide-react";

export default function GisInsightsPage() {
  const { colors } = useTheme();
  const { data: projects } = useMapProjects();
  const [selectedId, setSelectedId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [justSelected, setJustSelected] = useState(false);
  const [stallOpen, setStallOpen] = useState(false);
  const detailRef = useRef(null);
  
  const selectedProject = projects?.find((p) => (p.id || p.project_id) === selectedId) || null;

  // Handle selection from map marker, overlap detector, or silent stall panel.
  // Sets selectedId AND opens the modal popup. Re-clicking the same project re-opens the popup.
  const handleSelect = (id) => {
    setSelectedId(id);
    setModalOpen(true);
  };

  useEffect(() => {
    if (!selectedId) return;
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setJustSelected(true);
    const t = setTimeout(() => setJustSelected(false), 1500);
    return () => clearTimeout(t);
  }, [selectedId]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <SectionHeader
        eyebrow="GIS, COORDINATION & EARLY WARNING"
        title="GIS insights"
        icon={MapPinned}
        right={<SilentStallBell open={stallOpen} onToggle={() => setStallOpen((v) => !v)} />}
      />

      {stallOpen && (
        <SilentStallPanel
          onSelectProject={handleSelect}
          onClose={() => setStallOpen(false)}
        />
      )}

      <div className="flex flex-col xl:flex-row gap-5">
        {/* LEFT COLUMN: Map (takes 2/3 width on wide screens) */}
        <div className="xl:w-2/3 flex flex-col gap-5">
          <GisMapPanel selectedId={selectedId} onSelect={handleSelect} />
        </div>

        {/* RIGHT COLUMN: Selected Project Details Table (takes 1/3 width) */}
        <div className="xl:w-1/3 flex flex-col gap-5" ref={detailRef}>
          {selectedProject ? (
            <div
              className="transition-shadow duration-700 rounded-lg"
              style={{ boxShadow: justSelected ? `0 0 0 3px ${colors.accent}66` : "none" }}
            >
              <ProjectDetailsTable
                project={selectedProject}
                onOpenCaseFile={() => setModalOpen(true)}
                onClose={() => setSelectedId(null)}
              />
            </div>
          ) : (
            <div
              className="rounded-lg border p-5 h-[380px] sm:h-[440px] lg:h-[480px] flex items-center justify-center text-center text-sm"
              style={{ borderColor: colors.border, color: colors.textMuted }}
            >
              Select a high-risk project on the map or stall-alarm to view its case file and delay drivers.
            </div>
          )}
        </div>
      </div>

      <OverlapDetectorPanel onSelectProject={handleSelect} />

      {/* Modal popup on project click / Open case file */}
      <ProjectDetailModal
        project={selectedProject}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
