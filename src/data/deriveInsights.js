export const META = {
  states: [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
    'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
    'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ],
  fairnessGapThresholdPct: 20,
  overlapWindowDays: 180,
  silentStallThresholdDays: 90
};

export const TIER_COLOR = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#22c55e',
};

export function riskTier(pct) {
  if (pct >= 70) return 'High';
  if (pct >= 40) return 'Medium';
  return 'Low';
}

export function fairnessGapReport(projects = []) {
  const flagged = [];
  if (!Array.isArray(projects) || projects.length === 0) return flagged;
  
  // First, calculate the true average rate per hectare for each district
  const districtTotals = {};
  projects.forEach(p => {
    const offer = p.compensation_assessed_inr ?? p.compensationAssessed ?? p.projectBudget ?? p.project_budget ?? 0;
    const area = p.land_area_hectares ?? p.landAreaHectares ?? 1;
    const district = p.district || 'District';
    const rate = Number(area) > 0 ? Number(offer) / Number(area) : 0;
    
    if (rate > 0) {
      if (!districtTotals[district]) {
        districtTotals[district] = { sum: 0, count: 0 };
      }
      districtTotals[district].sum += rate;
      districtTotals[district].count += 1;
    }
  });

  projects.forEach(p => {
    const offer = p.compensation_assessed_inr ?? p.compensationAssessed ?? p.projectBudget ?? p.project_budget ?? 0;
    const area = p.land_area_hectares ?? p.landAreaHectares ?? 1;
    const district = p.district || 'District';
    const offerRatePerHa = Number(area) > 0 ? Number(offer) / Number(area) : 0;
    
    const districtStats = districtTotals[district];
    const districtAvg = districtStats && districtStats.count > 0 
      ? districtStats.sum / districtStats.count 
      : 15000000; 

    if (offerRatePerHa > 0 && offerRatePerHa < districtAvg) {
      const gapPct = Math.round(((districtAvg - offerRatePerHa) / districtAvg) * 100);
      if (gapPct >= META.fairnessGapThresholdPct) {
        flagged.push({
          project_id: p.project_id || p.id,
          state: p.state || 'State',
          district: p.district || 'District',
          implementing_department: p.implementing_department || p.department || 'NHAI',
          gap_pct: gapPct,
          offer_rate_per_hectare: Math.round(offerRatePerHa),
          district_avg_rate_per_hectare: Math.round(districtAvg),
          legal_disputes_count: p.legal_disputes_count ?? p.legalDisputes ?? 0
        });
      }
    }
  });
  return flagged;
}

export function overlapReport(projects = []) {
  const clusters = [];
  if (!Array.isArray(projects) || projects.length === 0) return clusters;
  
  const districtMap = {};
  
  projects.forEach(p => {
    const district = p.district || 'District';
    const state = p.state || 'India';
    const department = p.implementing_department || p.department || 'NHAI';
    const families = p.families_affected ?? p.familiesAffected ?? 0;
    const riskLevel = p.riskLevel || (p.riskScore >= 65 ? 'High' : 'Low');

    if (!districtMap[district]) {
      districtMap[district] = {
        district,
        state,
        total_families_affected: 0,
        departments: new Set(),
        projects: [],
        highRiskCount: 0
      };
    }
    const d = districtMap[district];
    d.total_families_affected += Number(families) || 0;
    if (department) d.departments.add(department);
    if (riskLevel === 'High') d.highRiskCount += 1;

    d.projects.push({
      project_id: p.project_id || p.id,
      project_type: p.project_type || p.projectType || 'Highway',
      notification_date: p.notification_date || p.notificationDate || 'Unknown'
    });
  });

  for (const dist in districtMap) {
    if (districtMap[dist].departments.size >= 2) {
      clusters.push({
        ...districtMap[dist],
        departments: Array.from(districtMap[dist].departments)
      });
    }
  }
  return clusters;
}

export function silentStallReport(projects = []) {
  const flagged = [];
  if (!Array.isArray(projects) || projects.length === 0) return flagged;

  projects.forEach(p => {
    const rawDate = p.last_activity_date || p.lastActivityDate;
    const lastActivity = rawDate ? new Date(rawDate) : new Date();
    const validDate = isNaN(lastActivity.getTime()) ? new Date() : lastActivity;
    const daysSince = Math.floor((Date.now() - validDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSince >= META.silentStallThresholdDays) {
      flagged.push({
        project_id: p.project_id || p.id,
        state: p.state || 'State',
        district: p.district || 'District',
        implementing_department: p.implementing_department || p.department || 'NHAI',
        days_stalled: daysSince,
        last_activity_date: rawDate,
        historical_dept_avg_delay_days: p.historical_dept_avg_delay_days ?? p.historicalDeptAvgDelayDays ?? 0,
        approval_stage: p.approval_stage || p.approvalStage || 'Unknown'
      });
    }
  });
  return flagged;
}
