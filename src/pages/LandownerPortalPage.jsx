import { Home, MapPin } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useSession } from "../context/SessionContext";
import { useLandownerCase } from "../hooks/useLandownerCase";
import SectionHeader from "../components/shared/SectionHeader";
import Skeleton from "../components/shared/Skeleton";
import ReportButton from "../components/shared/ReportButton";
import ProjectDocuments from "../components/shared/ProjectDocuments";
import TimelinePanel from "../components/dashboard/TimelinePanel";
import CompletionOverview from "../components/dashboard/CompletionOverview";
import CaseStatusBanner from "../components/dashboard/CaseStatusBanner";
import CompensationStatusCard from "../components/dashboard/CompensationStatusCard";

// Feature #13 — Landowner Portal. Deliberately a separate, simplified page
// rather than a cut-down view of the official dashboard: a landowner logs
// in and sees exactly one case (their own), in plain language, with no
// register, no filters, and no other landowners' data ever reachable from
// here. useLandownerCase() resolves that single case from the signed-in
// user, so there is no id parameter for anyone to tamper with client-side.
export default function LandownerPortalPage() {
  const { colors } = useTheme();
  const { user } = useSession();
  const { data: project, isLoading } = useLandownerCase();

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <SectionHeader
        index="13"
        eyebrow="LANDOWNER PORTAL"
        title="Your land case"
        icon={Home}
        right={
          <span className="text-xs" style={{ color: colors.textFaint }}>
            Signed in as {user.name}
          </span>
        }
      />

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-52 w-full" />
        </div>
      )}

      {!isLoading && !project && (
        <div className="rounded-lg border p-8 text-center" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
          <p className="text-sm" style={{ color: colors.textMuted }}>
            No case is currently linked to your account. If you believe this is an error, contact your
            district land acquisition office.
          </p>
        </div>
      )}

      {!isLoading && project && (
        <>
          <div
            className="rounded-lg border p-4 flex items-center justify-between gap-4"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <div>
              <div className="font-medium" style={{ color: colors.text }}>
                {project.projectType}
              </div>
              <div className="flex items-center gap-1.5 text-xs mt-1" style={{ color: colors.textMuted }}>
                <MapPin size={11} />
                {project.village} · {project.district}, {project.state} · Case ID {project.id}
              </div>
            </div>
            <ReportButton project={project} label="Download my case report (PDF)" />
          </div>

          <CaseStatusBanner project={project} />
          <CompensationStatusCard project={project} />

          {project.timeline?.length > 0 && <TimelinePanel project={project} />}
          {project.status === "Completed" && <CompletionOverview project={project} />}

          <div className="rounded-lg border p-5" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
            <ProjectDocuments project={project} />
          </div>
        </>
      )}
    </div>
  );
}
