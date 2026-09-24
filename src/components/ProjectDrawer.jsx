import { X, MapPin, Users, IndianRupee, Gavel, Clock, ShieldAlert, Sparkles } from 'lucide-react'
import RiskBadge from './RiskBadge'
import { fairnessGapReport, silentStallReport } from '../data/deriveInsights'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { apiClient } from '../api/client'
import AuditTrailModal from './AuditTrailModal'

export default function ProjectDrawer({ project, projects, onClose, onRefresh }) {
  const { user } = useAuth()
  const [showAudit, setShowAudit] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiFairnessReport, setAiFairnessReport] = useState(null)
  const [isCheckingFairness, setIsCheckingFairness] = useState(false)

  useEffect(() => {
    setAiFairnessReport(null)
  }, [project?.project_id])

  if (!project) return null

  const fairnessHit = fairnessGapReport(projects).find((f) => f.project_id === project.project_id)
  const stallHit = silentStallReport(projects).find((s) => s.project_id === project.project_id)

  const handleReanalyze = async () => {
    setIsAnalyzing(true)
    try {
      await apiClient.post(`/projects/${project.project_id}/analyze`)
      if (onRefresh) onRefresh()
    } catch (err) {
      console.error('Failed to analyze', err)
      alert(err.response?.data?.message || 'Failed to trigger re-analysis. Check permissions.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleFairnessCheck = async () => {
    setIsCheckingFairness(true)
    try {
      const res = await apiClient.post(`/projects/${project.project_id}/fairness`)
      setAiFairnessReport(res.data.fairness_report || 'NO_GAP')
    } catch (err) {
      console.error('Failed to check fairness', err)
      alert(err.response?.data?.message || 'Failed to check fairness.')
    } finally {
      setIsCheckingFairness(false)
    }
  }

  return (
    <div className="absolute inset-y-0 right-0 z-[1000] w-[380px] overflow-y-auto border-l border-ink-800/10 bg-paper-50 shadow-2xl">
      <div className="flex items-start justify-between bg-ink-950 px-5 py-4 text-paper-50">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-wider text-marigold-500">
            Case File
          </div>
          <div className="font-display text-lg font-semibold">{project.project_id}</div>
        </div>
        <button onClick={onClose} className="rounded p-1 text-slate-450 hover:bg-ink-800 hover:text-paper-50">
          <X size={18} />
        </button>
      </div>

      <div className="space-y-5 p-5">
        <div className="flex items-center justify-between">
          <RiskBadge tier={project.risk} pct={project.predicted_risk_pct} />
          <span className="rounded bg-ink-900/5 px-2 py-1 font-mono text-[11px] text-ink-700">
            {project.project_type}
          </span>
        </div>
        {project.predicted_risk_is_placeholder && (
          <div className="rounded border border-marigold-500/30 bg-marigold-500/10 px-3 py-2 text-[11px] leading-relaxed text-marigold-600">
            Risk score is a placeholder — swap for the model's predicted_risk_pct once /predict is live.
          </div>
        )}

        <div className="docket-rule pt-4">
          <DocketRow icon={MapPin} label="Location" value={`${project.district}, ${project.state}`} />
          <DocketRow icon={Users} label="Families affected" value={project.families_affected.toLocaleString('en-IN')} />
          <DocketRow
            icon={IndianRupee}
            label="Compensation assessed"
            value={`₹${(project.compensation_assessed_inr / 1e7).toFixed(2)} Cr · ${project.compensation_disbursed_pct}% disbursed`}
          />
          <DocketRow icon={Gavel} label="Legal disputes" value={project.legal_disputes_count} />
          <DocketRow icon={Clock} label="Approval stage" value={project.approval_stage} />
        </div>

        <div className="docket-rule grid grid-cols-2 gap-3 pt-4 text-xs">
          <Field label="Department" value={project.implementing_department} />
          <Field label="Stakeholder responsiveness" value={project.stakeholder_responsiveness} />
          <Field label="R&R progress" value={`${project.rr_progress_pct}%`} />
          <Field label="Dept. avg delay" value={`${project.historical_dept_avg_delay_days} days`} />
          <Field label="Notified" value={project.notification_date} />
          <Field label="Last activity" value={project.last_activity_date} />
        </div>

        {(fairnessHit || stallHit) && (
          <div className="docket-rule space-y-2 pt-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-450">Flags raised</div>
            {fairnessHit && (
              <FlagCard
                color="vermilion"
                title="Fairness gap"
                body={`Offer is ${fairnessHit.gap_pct}% below the ${project.district} district average (₹${fairnessHit.offer_rate_per_hectare.toLocaleString('en-IN')}/ha vs ₹${fairnessHit.district_avg_rate_per_hectare.toLocaleString('en-IN')}/ha).`}
              />
            )}
            {stallHit && (
              <FlagCard
                color="marigold"
                title="Silent stall"
                body={`No file activity in ${stallHit.days_silent} days.`}
              />
            )}
          </div>
        )}

        {project.recommended_action ? (
          <div className="docket-rule pt-4">
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-450">
              Recommended action
            </div>
            <p className="text-sm leading-relaxed text-ink-800">{project.recommended_action}</p>
          </div>
        ) : (
          <div className="docket-rule pt-4">
            <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-450">
              Recommended action
            </div>
            <div className="flex items-center gap-2 rounded border border-ink-800/10 bg-ink-900/5 px-3 py-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-marigold-500 animate-pulse"></div>
              <span className="text-[11px] text-ink-700 font-medium">Pending AI Analysis. Click Re-Analyze below to generate.</span>
            </div>
          </div>
        )}

        <div className="docket-rule pt-4 pb-2">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-450">
            AI Fairness Verification
          </div>
          {aiFairnessReport === 'NO_GAP' ? (
            <div className="flex items-center gap-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-emerald-700 text-[11px] font-medium">
              <Scale size={14} />
              Compensation rate aligns with the district average. No fairness gap detected.
            </div>
          ) : aiFairnessReport ? (
             <FlagCard
               color="vermilion"
               title="Critical Fairness Gap Detected"
               body={`This project's offer is ${aiFairnessReport.gap_pct}% below the ${project.district} district average (₹${aiFairnessReport.offer_rate_per_hectare.toLocaleString('en-IN')}/ha vs ₹${aiFairnessReport.district_avg_rate_per_hectare.toLocaleString('en-IN')}/ha). High litigation risk.`}
             />
          ) : (
            <button
              onClick={handleFairnessCheck}
              disabled={isCheckingFairness}
              className="w-full bg-ink-900 hover:bg-ink-800 text-paper-50 text-xs font-mono font-medium tracking-wide py-2 rounded transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Scale size={14} className="text-brass-500" />
              {isCheckingFairness ? 'Running AI Fairness Scan...' : 'Run Live Fairness Check'}
            </button>
          )}
        </div>

        {/* RBAC Admin / Official Controls */}
        {user && (user.role === 'Admin' || user.role === 'Official') && (
          <div className="docket-rule pt-5 pb-8 flex items-center gap-3">
            <button
              onClick={handleReanalyze}
              disabled={isAnalyzing}
              className="flex-1 bg-brass-600 hover:bg-brass-500 text-ink-950 text-xs font-mono font-bold tracking-wide uppercase py-2.5 rounded transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles size={14} />
              {isAnalyzing ? 'Analyzing...' : 'Re-Analyze'}
            </button>
            <button
              onClick={() => setShowAudit(true)}
              className="px-4 py-2.5 bg-ink-900 border border-ink-800 text-paper-50 hover:bg-ink-800 text-xs font-mono uppercase tracking-wide rounded transition-colors flex items-center gap-1.5"
            >
              <ShieldAlert size={14} className="text-brass-500" />
              Audit Log
            </button>
          </div>
        )}
      </div>

      {showAudit && (
        <AuditTrailModal 
          projectId={project.project_id} 
          onClose={() => setShowAudit(false)} 
        />
      )}
    </div>
  )
}

function DocketRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <Icon size={15} className="shrink-0 text-slate-450" strokeWidth={1.75} />
      <span className="w-36 shrink-0 text-xs text-slate-450">{label}</span>
      <span className="text-sm font-medium text-ink-900">{value}</span>
    </div>
  )
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-450">{label}</div>
      <div className="font-medium text-ink-900">{value}</div>
    </div>
  )
}

function FlagCard({ color, title, body }) {
  const styles = {
    vermilion: 'border-vermilion-500/30 bg-vermilion-500/10 text-vermilion-600',
    marigold: 'border-marigold-500/30 bg-marigold-500/10 text-marigold-600',
  }
  return (
    <div className={`rounded border px-3 py-2 text-[11px] leading-relaxed ${styles[color]}`}>
      <div className="font-semibold">{title}</div>
      {body}
    </div>
  )
}
