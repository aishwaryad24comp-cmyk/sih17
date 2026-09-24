import { Router } from 'express';
import Project from '../models/Project';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

function safeFormatDate(val: any): string | null {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

router.get('/district-trend', authenticate, async (req, res) => {
  try {
    const projects = await Project.find();
    
    let currentHigh = 0, currentMed = 0, currentLow = 0;
    projects.forEach(p => {
      const score = p.predicted_risk_pct || Math.round((p.risk_score_raw || 0) * 100);
      if (score >= 65) currentHigh++;
      else if (score >= 35) currentMed++;
      else currentLow++;
    });

    const months = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];
    const trend = months.map((month, index) => {
      const factor = (index + 1) / 6;
      return {
        month,
        High: Math.max(5, Math.round(currentHigh * (0.5 + 0.5 * factor))),
        Medium: Math.max(5, Math.round(currentMed * (0.6 + 0.4 * factor))),
        Low: Math.max(5, Math.round(currentLow * (0.7 + 0.3 * factor)))
      };
    });

    res.json(trend);
  } catch (error) {
    res.status(500).json({ message: 'Error generating district trend' });
  }
});

router.get('/state-comparison', authenticate, async (req, res) => {
  try {
    const projects = await Project.find();
    
    const byState: Record<string, { state: string, High: number, Medium: number, Low: number }> = {};
    
    projects.forEach(p => {
      if (p.state) {
        if (!byState[p.state]) {
          byState[p.state] = { state: p.state, High: 0, Medium: 0, Low: 0 };
        }
        const score = p.predicted_risk_pct || Math.round((p.risk_score_raw || 0) * 100);
        if (score >= 65) byState[p.state].High++;
        else if (score >= 35) byState[p.state].Medium++;
        else byState[p.state].Low++;
      }
    });

    const sorted = Object.values(byState).sort((a, b) => (b.High + b.Medium) - (a.High + a.Medium));
    
    res.json(sorted.slice(0, 6));
  } catch (error) {
    res.status(500).json({ message: 'Error generating state comparison' });
  }
});

router.get('/summary', authenticate, async (req, res) => {
  try {
    const projects = await Project.find();
    let high = 0, medium = 0, low = 0, totalDelay = 0;
    
    projects.forEach(p => {
      const score = p.predicted_risk_pct || Math.round((p.risk_score_raw || 0) * 100);
      if (score >= 65) high++;
      else if (score >= 35) medium++;
      else low++;
      
      if (p.delay_days && p.delay_days > 0) totalDelay += p.delay_days;
    });

    res.json({
      total: projects.length,
      high,
      medium,
      low,
      avgOverdue: projects.length ? Math.round(totalDelay / projects.length) : 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating summary' });
  }
});

router.get('/department-risk', authenticate, async (req, res) => {
  try {
    const { department } = req.query;
    const filter: Record<string, any> = department ? { implementing_department: department } : {};
    const projects = await Project.find(filter);
    
    let high = 0, medium = 0, low = 0;
    projects.forEach(p => {
      const score = p.predicted_risk_pct || Math.round((p.risk_score_raw || 0) * 100);
      if (score >= 65) high++;
      else if (score >= 35) medium++;
      else low++;
    });

    res.json([
      { name: "High", value: high },
      { name: "Medium", value: medium },
      { name: "Low", value: low }
    ]);
  } catch (error) {
    res.status(500).json({ message: 'Error generating department risk' });
  }
});

router.get('/progress-by-stage', authenticate, async (req, res) => {
  try {
    const projects = await Project.find();
    const stages = [
      { key: "notification", label: "SIA & Notification" },
      { key: "declaration", label: "Declaration" },
      { key: "award", label: "Award Enquiry" },
      { key: "disbursement", label: "Compensation" },
      { key: "possession", label: "Possession" }
    ];

    const result = stages.map(stage => {
      let completed = 0;
      let overdue = 0;

      projects.forEach(p => {
        const lowerStage = (p.approval_stage || '').toString().toLowerCase();
        let currentStageNum = 3;
        if (lowerStage.includes('section 11') || lowerStage.includes('stage 1')) currentStageNum = 1;
        else if (lowerStage.includes('section 15') || lowerStage.includes('section 19') || lowerStage.includes('stage 2')) currentStageNum = 2;
        else if (lowerStage.includes('stage 3')) currentStageNum = 3;
        else if (lowerStage.includes('stage 4')) currentStageNum = 4;
        else if (lowerStage.includes('stage 5')) currentStageNum = 5;
        else {
          const num = parseInt(lowerStage.match(/\d+/)?.[0] || '3', 10);
          currentStageNum = (num >= 1 && num <= 5) ? num : 3;
        }
        const thisStageNum = stages.indexOf(stage) + 1;
        
        if (currentStageNum > thisStageNum) {
          completed++;
        } else if (currentStageNum === thisStageNum) {
          if (p.delayed === 'Y') {
            overdue++;
            completed++;
          }
        }
      });
      return { stage: stage.label, completed, overdue, onTime: completed - overdue };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error generating progress by stage' });
  }
});
router.get('/overlap-clusters', authenticate, async (req, res) => {
  try {
    const projects = await Project.find();
    const clusters: any[] = [];
    const districtMap: Record<string, any> = {};
    
    projects.forEach(p => {
      if (!p.district) return;
      if (!districtMap[p.district]) {
        districtMap[p.district] = {
          district: p.district,
          state: p.state,
          total_families_affected: 0,
          departments: new Set(),
          projects: []
        };
      }
      const d = districtMap[p.district];
      d.total_families_affected += p.families_affected || 0;
      d.departments.add(p.implementing_department);
      d.projects.push({
        project_id: p.project_id,
        project_type: p.project_type,
        notification_date: safeFormatDate(p.notification_date) || 'Unknown'
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
    res.json(clusters);
  } catch (error) {
    res.status(500).json({ message: 'Error generating overlap clusters' });
  }
});

router.get('/silent-stalls', authenticate, async (req, res) => {
  try {
    const projects = await Project.find();
    const flagged: any[] = [];
    
    projects.forEach(p => {
      const lastActivity = p.last_activity_date ? new Date(p.last_activity_date as any) : new Date();
      const daysSince = isNaN(lastActivity.getTime()) ? 0 : Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSince >= 90) { // 90 days threshold
        flagged.push({
          project_id: p.project_id,
          state: p.state,
          district: p.district,
          implementing_department: p.implementing_department,
          days_stalled: daysSince,
          last_activity_date: safeFormatDate(p.last_activity_date),
          historical_dept_avg_delay_days: p.historical_dept_avg_delay_days || 0,
          approval_stage: p.approval_stage || 'Unknown'
        });
      }
    });
    res.json(flagged);
  } catch (error) {
    res.status(500).json({ message: 'Error generating silent stalls' });
  }
});

export default router;
