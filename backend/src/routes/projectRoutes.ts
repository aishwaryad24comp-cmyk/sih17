import { Router, Request, Response } from 'express';
import Project from '../models/Project';
import AuditLog from '../models/AuditLog';
import { authenticate, requireRole, AuthRequest, requireOwnership } from '../middleware/authMiddleware';
import { sendAlertEmail } from '../services/alertEngine';
import axios from 'axios';
import PDFDocument from 'pdfkit';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

function formatDateString(val: any, fallback: string): string {
  if (!val) return fallback;
  const d = new Date(val);
  if (isNaN(d.getTime())) return fallback;
  return d.toISOString().split('T')[0];
}

function buildFastApiPayload(project: any) {
  return {
    state: project.state || 'Maharashtra',
    district: project.district || 'Pune',
    latitude: Number(project.latitude) || 18.5204,
    longitude: Number(project.longitude) || 73.8567,
    project_type: project.project_type || 'Highway',
    implementing_department: project.implementing_department || 'NHAI',
    land_area_hectares: Number(project.land_area_hectares) || 100,
    families_affected: Number(project.families_affected) || 50,
    compensation_assessed_inr: Number(project.compensation_assessed_inr) || 10000000,
    compensation_disbursed_pct: Number(project.compensation_disbursed_pct) || 50,
    legal_disputes_count: Number(project.legal_disputes_count) || 0,
    notification_date: formatDateString(project.notification_date, '2024-01-10'),
    approval_stage: project.approval_stage || 'Stage 3 of 5',
    rr_progress_pct: Number(project.rr_progress_pct) || 0,
    stakeholder_responsiveness: project.stakeholder_responsiveness || 'Medium',
    historical_dept_avg_delay_days: Number(project.historical_dept_avg_delay_days) || 210,
    last_activity_date: formatDateString(project.last_activity_date, '2026-08-01'),
    project_budget: Number(project.project_budget) || 500000000
  };
}

// Feature #18 - Department-Based Dashboard Filter
// Must be defined BEFORE the '/:id' route below - otherwise Express would
// match a request to '/departments' as if ':id' were literally "departments".
// Returns only departments that actually have projects (not the full static
// enum), so the frontend filter dropdown never shows an option with 0 results.
router.get('/departments', authenticate, async (req, res) => {
  try {
    const departments = await Project.distinct('implementing_department');
    res.json({ departments: departments.sort() });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching department list' });
  }
});

// Secured with authenticate
// Feature #18: now supports ?department=NHAI to filter the dashboard by
// department. Omit the query param to get everything, unchanged from before.
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { department, createdBy } = req.query;
    const filter: Record<string, any> = {};

    if (department) {
      filter.implementing_department = department;
    }
    if (createdBy) {
      const matchValues: string[] = [createdBy as string];
      if (req.user?.username) matchValues.push(req.user.username);
      if (req.user?.id) matchValues.push(req.user.id);
      filter.created_by = { $in: Array.from(new Set(matchValues)) };
    }

    const projects = await Project.find(filter).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching projects' });
  }
});

// Bulk Upload CSV Route (Feature #30)
router.post('/upload-csv', authenticate, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const rows: any[] = [];
    const stream = Readable.from(req.file.buffer);

    stream
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', async () => {
        let inserted = 0;
        let skipped = 0;
        for (const row of rows) {
          try {
            const exists = await Project.findOne({ project_id: row.project_id });
            if (exists) {
              skipped++;
              continue;
            }

            // Normalize project_type to schema enum
            const rawType = String(row.project_type || 'Highway');
            let project_type = 'Highway';
            if (rawType.includes('Railway')) project_type = 'Railway';
            else if (rawType.includes('Irrigation') || rawType.includes('Water')) project_type = 'Irrigation/Water Res.';
            else if (rawType.includes('Industrial') || rawType.includes('Corridor')) project_type = 'Industrial Corridor';
            else if (rawType.includes('Power') || rawType.includes('Transmission')) project_type = 'Power Transmission';
            else if (rawType.includes('Metro') || rawType.includes('Urban')) project_type = 'Urban Infra/Metro';
            else if (rawType.includes('Highway')) project_type = 'Highway';

            // Normalize implementing_department to schema enum
            const rawDept = String(row.implementing_department || 'NHAI');
            let implementing_department = 'NHAI';
            if (rawDept.includes('Railway') && rawDept.includes('Infra')) implementing_department = 'State Railway Infra Corp';
            else if (rawDept.includes('Railway')) implementing_department = 'Ministry of Railways';
            else if (rawDept.includes('Irrigation') || rawDept.includes('Water')) implementing_department = 'State Water Resources Dept';
            else if (rawDept.includes('Electricity') || rawDept.includes('Board')) implementing_department = 'State Electricity Board';
            else if (rawDept.includes('Power')) implementing_department = 'Power Grid Corp';
            else if (rawDept.includes('Metro')) implementing_department = 'State Metro Rail Corp';
            else if (rawDept.includes('Urban')) implementing_department = 'Urban Dev. Authority';
            else if (rawDept.includes('Industrial') || rawDept.includes('DMIC')) implementing_department = 'DMIC/NICDC';
            else if (rawDept.includes('PWD')) implementing_department = 'State PWD';
            else implementing_department = 'NHAI';

            const projectData = {
              project_id: row.project_id || `LA-CSV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              state: row.state || 'Maharashtra',
              district: row.district || 'Pune',
              latitude: parseFloat(row.latitude) || (18.5 + Math.random() * 2),
              longitude: parseFloat(row.longitude) || (73.5 + Math.random() * 2),
              project_type,
              implementing_department,
              land_area_hectares: parseFloat(row.land_area_hectares) || 10,
              families_affected: parseInt(row.families_affected, 10) || 10,
              compensation_assessed_inr: parseFloat(row.compensation_assessed_inr) || 10000000,
              compensation_disbursed_pct: parseFloat(row.compensation_disbursed_pct) || 50,
              legal_disputes_count: parseInt(row.legal_disputes_count, 10) || 0,
              notification_date: row.notification_date || new Date().toISOString().split('T')[0],
              approval_stage: row.approval_stage || 'Stage 1 of 5',
              rr_progress_pct: parseFloat(row.rr_progress_pct) || 50,
              stakeholder_responsiveness: row.stakeholder_responsiveness || 'Medium',
              historical_dept_avg_delay_days: parseInt(row.historical_dept_avg_delay_days, 10) || 120,
              last_activity_date: row.last_activity_date || new Date().toISOString().split('T')[0],
              risk_score_raw: row.risk_score_raw ? parseFloat(row.risk_score_raw) : undefined,
              delayed: row.delayed || 'N',
              delay_days: row.delay_days ? parseInt(row.delay_days, 10) : undefined,
              predicted_risk_pct: row.predicted_risk_pct
                ? parseFloat(row.predicted_risk_pct)
                : (row.risk_score_raw ? Math.round(parseFloat(row.risk_score_raw) * 100) : 45),
              recommended_action: row.recommended_action || undefined,
              project_budget: row.project_budget ? parseFloat(row.project_budget) : (parseFloat(row.compensation_assessed_inr) || 10000000),
              status: row.status || 'Ongoing',
              created_by: req.user?.id || req.user?.username || 'unknown'
            };

            const project = await Project.create(projectData);
            
            // If the CSV project is High Risk (>= 65%), immediately dispatch alert email
            if (project.predicted_risk_pct && project.predicted_risk_pct >= 65) {
              sendAlertEmail({
                projectId: project.project_id,
                projectName: project.project_type || 'Land Acquisition Project',
                riskPct: project.predicted_risk_pct,
                district: project.district,
                createdBy: project.created_by
              }).catch((err: any) => console.error('CSV high risk email dispatch error:', err.message));
            }

            // Log creation audit
            await AuditLog.create({
              userId: req.user?.id || 'unknown',
              action: 'CREATE',
              details: `Bulk uploaded via CSV: Project ${project.project_id}`
            });

            inserted++;
          } catch (err: any) {
            console.error(`Failed to import ${row.project_id}:`, err.message);
          }
        }
        res.json({ message: 'CSV Import Complete', inserted, skipped });
      });
  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({ message: 'Error processing CSV upload' });
  }
});

// Secured with authenticate
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findOne({ project_id: req.params.id });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching project' });
  }
});
router.post('/:id/analyze', authenticate, requireRole(['Admin', 'Official']), async (req: AuthRequest, res: any) => {
  try {
    const project = await Project.findOne({ project_id: req.params.id });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';

    // Prepare payload for FastAPI matching ProjectInput exactly
    const payload = {
      state: project.state,
      district: project.district,
      latitude: project.latitude,
      longitude: project.longitude,
      project_type: project.project_type,
      implementing_department: project.implementing_department,
      land_area_hectares: project.land_area_hectares,
      families_affected: project.families_affected,
      compensation_assessed_inr: project.compensation_assessed_inr,
      compensation_disbursed_pct: project.compensation_disbursed_pct,
      legal_disputes_count: project.legal_disputes_count,
      notification_date: project.notification_date,
      approval_stage: project.approval_stage,
      rr_progress_pct: project.rr_progress_pct,
      stakeholder_responsiveness: project.stakeholder_responsiveness,
      historical_dept_avg_delay_days: project.historical_dept_avg_delay_days,
      last_activity_date: project.last_activity_date
    };
    let predicted_risk_pct = null;
    let top_shap_drivers = null;
    let recommended_action = null;
    try {
      const predictRes = await axios.post(`${fastApiUrl}/predict`, payload);
      predicted_risk_pct = predictRes.data.predicted_risk_pct;
      const explainRes = await axios.post(`${fastApiUrl}/explain`, payload);
      top_shap_drivers = explainRes.data.top_shap_drivers;
      const recommendRes = await axios.post(`${fastApiUrl}/recommend`, payload);
      const firstRec = Array.isArray(recommendRes.data.recommended_actions)
        ? recommendRes.data.recommended_actions[0]
        : recommendRes.data.recommended_actions;
      recommended_action = firstRec?.recommendation || firstRec?.action || JSON.stringify(firstRec);
    } catch (err: any) {
      console.error('Error connecting to FastAPI:', err.message);
      // Fallback dummy logic if FastAPI is down during development
      predicted_risk_pct = 45.5;
      top_shap_drivers = ["legal_disputes_count: 0.15", "rr_progress_pct: -0.05"];
      recommended_action = `FastAPI connection failed! URL: ${fastApiUrl} | Error: ${err.message}`;
    }
    // Save predictions back to MongoDB
    project.predicted_risk_pct = predicted_risk_pct;
    project.top_shap_drivers = top_shap_drivers;
    project.recommended_action = recommended_action;
    await project.save();
    await AuditLog.create({
      userId: req.user?.id || 'unknown',
      action: 'ANALYZE_PROJECT',
      details: `Project ID: ${project.project_id}`
    });
    res.json(project);
  } catch (error: any) {
    console.error('Error analyzing project:', error);
    res.status(500).json({ message: 'Server error analyzing project' });
  }
});

// Feature #25: Single Project PDF Export
router.get('/:id/report', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findOne({ project_id: req.params.id });
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Project_${project.project_id}_Report.pdf`);
    doc.pipe(res);

    doc.fontSize(20).text(`Project Report: ${project.project_id}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Type: ${project.project_type}`);
    doc.text(`Department: ${project.implementing_department}`);
    doc.text(`Location: ${project.district}, ${project.state}`);
    doc.moveDown();
    
    doc.fontSize(14).text('Risk & Progress Analytics', { underline: true });
    doc.fontSize(12).text(`Predicted Risk: ${project.predicted_risk_pct ?? 'N/A'}%`);
    doc.text(`Delay Days: ${project.delay_days ?? project.historical_dept_avg_delay_days ?? 0}`);
    doc.text(`R&R Progress: ${project.rr_progress_pct}%`);
    doc.text(`Legal Disputes: ${project.legal_disputes_count}`);
    doc.moveDown();

    if (project.recommended_action) {
      doc.fontSize(14).text('Recommended Action', { underline: true });
      doc.fontSize(12).text(project.recommended_action);
    }

    doc.end();

    await AuditLog.create({
      userId: req.user?.id || 'unknown',
      action: 'EXPORT_REPORT',
      details: `Exported report for project ${project.project_id}`
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Error generating report' });
  }
});

// Feature #21: Add-Project Intake Form
router.post('/', authenticate, requireRole(['Admin', 'Official']), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const raw = req.body || {};
    
    // Normalize project_type to schema enum: ["Highway", "Railway", "Irrigation/Water Res.", "Industrial Corridor", "Power Transmission", "Urban Infra/Metro"]
    const rawType = String(raw.project_type || raw.projectType || 'Highway');
    let project_type = 'Highway';
    if (rawType.includes('Railway')) project_type = 'Railway';
    else if (rawType.includes('Irrigation') || rawType.includes('Water')) project_type = 'Irrigation/Water Res.';
    else if (rawType.includes('Industrial') || rawType.includes('Corridor')) project_type = 'Industrial Corridor';
    else if (rawType.includes('Power') || rawType.includes('Transmission')) project_type = 'Power Transmission';
    else if (rawType.includes('Metro') || rawType.includes('Urban')) project_type = 'Urban Infra/Metro';
    else if (rawType.includes('Highway')) project_type = 'Highway';

    // Normalize implementing_department to schema enum
    const rawDept = String(raw.implementing_department || raw.department || 'NHAI');
    let implementing_department = 'NHAI';
    if (rawDept.includes('Railway') && rawDept.includes('Infra')) implementing_department = 'State Railway Infra Corp';
    else if (rawDept.includes('Railway')) implementing_department = 'Ministry of Railways';
    else if (rawDept.includes('Irrigation') || rawDept.includes('Water')) implementing_department = 'State Water Resources Dept';
    else if (rawDept.includes('Electricity') || rawDept.includes('Board')) implementing_department = 'State Electricity Board';
    else if (rawDept.includes('Power')) implementing_department = 'Power Grid Corp';
    else if (rawDept.includes('Metro')) implementing_department = 'State Metro Rail Corp';
    else if (rawDept.includes('Urban')) implementing_department = 'Urban Dev. Authority';
    else if (rawDept.includes('Industrial') || rawDept.includes('DMIC')) implementing_department = 'DMIC/NICDC';
    else if (rawDept.includes('PWD')) implementing_department = 'State PWD';
    else implementing_department = 'NHAI';

    const project_id = raw.project_id || raw.id || `LA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const state = raw.state || 'Maharashtra';
    const district = raw.district || 'Nashik';
    const latitude = Number(raw.latitude ?? raw.lat) || (18.5 + Math.random() * 2);
    const longitude = Number(raw.longitude ?? raw.lng) || (73.5 + Math.random() * 2);
    const land_area_hectares = Math.max(0.1, Number(raw.land_area_hectares ?? raw.landAreaHectares) || 10);
    const families_affected = Math.max(0, Number(raw.families_affected ?? raw.familiesAffected) || 10);
    const compensation_assessed_inr = Math.max(0, Number(raw.compensation_assessed_inr ?? raw.projectBudget) || 10000000);
    const compensation_disbursed_pct = Math.min(100, Math.max(0, Number(raw.compensation_disbursed_pct ?? raw.compensationDisbursedPct) || 50));
    const legal_disputes_count = Math.max(0, Number(raw.legal_disputes_count ?? raw.legalDisputes) || 0);
    const notification_date = raw.notification_date || new Date().toISOString().split('T')[0];
    const approval_stage = typeof raw.approval_stage === 'number' ? `Stage ${raw.approval_stage} of 5` : (raw.approvalStage ? `Stage ${raw.approvalStage} of 5` : (raw.approval_stage || 'Stage 1 of 5'));
    const rr_progress_pct = Math.min(100, Math.max(0, Number(raw.rr_progress_pct ?? raw.rrProgressPct) || 50));
    const stakeholder_responsiveness = raw.stakeholder_responsiveness || 'Medium';
    const historical_dept_avg_delay_days = Number(raw.historical_dept_avg_delay_days) || 120;
    const last_activity_date = raw.last_activity_date || new Date().toISOString().split('T')[0];
    const project_budget = Number(raw.project_budget ?? raw.projectBudget) || compensation_assessed_inr;
    const created_by = req.user?.id || 'unknown';

    const normalizedData = {
      ...raw,
      project_id,
      state,
      district,
      latitude,
      longitude,
      project_type,
      implementing_department,
      land_area_hectares,
      families_affected,
      compensation_assessed_inr,
      compensation_disbursed_pct,
      legal_disputes_count,
      notification_date,
      approval_stage,
      rr_progress_pct,
      stakeholder_responsiveness,
      historical_dept_avg_delay_days,
      last_activity_date,
      project_budget,
      status: raw.status || 'Ongoing',
      created_by
    };
    
    const project = new Project(normalizedData);
    await project.save();
    
    await AuditLog.create({
      userId: req.user?.id || 'unknown',
      action: 'ADD_PROJECT',
      details: `Project ID: ${project.project_id} created`
    });
    
    // Auto-trigger analysis but don't block the response
    const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
    axios.post(`http://localhost:${process.env.PORT || 5000}/api/projects/${project.project_id}/analyze`, {}, {
      headers: { Authorization: req.header('Authorization') }
    }).catch(err => console.error("Auto-analyze failed:", err.message));
    
    res.status(201).json(project);
  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Error creating project', error: error.message });
  }
});

// Feature #24: Ownership-scoped edit
router.put('/:id', authenticate, requireOwnership, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const project = await Project.findOneAndUpdate(
      { project_id: req.params.id },
      { $set: req.body },
      { new: true }
    );
    
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    
    await AuditLog.create({
      userId: req.user?.id || 'unknown',
      action: 'UPDATE_PROJECT',
      details: `Project ID: ${project.project_id} updated`
    });
    
    res.json(project);
  } catch (error: any) {
    res.status(500).json({ message: 'Error updating project', error: error.message });
  }
});

router.post('/:id/analyze', authenticate, requireRole(['Admin', 'Official']), async (req: AuthRequest, res: any) => {
  try {
    const project = await Project.findOne({ project_id: req.params.id });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';

    // Prepare payload for FastAPI matching ProjectInput exactly
    const payload = {
      state: project.state,
      district: project.district,
      latitude: project.latitude,
      longitude: project.longitude,
      project_type: project.project_type,
      implementing_department: project.implementing_department,
      land_area_hectares: project.land_area_hectares,
      families_affected: project.families_affected,
      compensation_assessed_inr: project.compensation_assessed_inr,
      compensation_disbursed_pct: project.compensation_disbursed_pct,
      legal_disputes_count: project.legal_disputes_count,
      notification_date: project.notification_date,
      approval_stage: project.approval_stage,
      rr_progress_pct: project.rr_progress_pct,
      stakeholder_responsiveness: project.stakeholder_responsiveness,
      historical_dept_avg_delay_days: project.historical_dept_avg_delay_days,
      last_activity_date: project.last_activity_date
    };
    let predicted_risk_pct = null;
    let top_shap_drivers = null;
    let recommended_action = null;
    try {
      const predictRes = await axios.post(`${fastApiUrl}/predict`, payload);
      predicted_risk_pct = predictRes.data.predicted_risk_pct;
      const explainRes = await axios.post(`${fastApiUrl}/explain`, payload);
      top_shap_drivers = explainRes.data.top_shap_drivers;
      const recommendRes = await axios.post(`${fastApiUrl}/recommend`, payload);
      const firstRec = Array.isArray(recommendRes.data.recommended_actions)
        ? recommendRes.data.recommended_actions[0]
        : recommendRes.data.recommended_actions;
      recommended_action = firstRec?.recommendation || firstRec?.action || JSON.stringify(firstRec);
    } catch (err: any) {
      console.error('Error connecting to FastAPI:', err.message);
      // Fallback dummy logic if FastAPI is down during development
      predicted_risk_pct = 45.5;
      top_shap_drivers = ["legal_disputes_count: 0.15", "rr_progress_pct: -0.05"];
      recommended_action = `FastAPI connection failed! URL: ${fastApiUrl} | Error: ${err.message}`;
    }
    // Save predictions back to MongoDB
    project.predicted_risk_pct = predicted_risk_pct;
    project.top_shap_drivers = top_shap_drivers;
    project.recommended_action = recommended_action;
    await project.save();
    await AuditLog.create({
      userId: req.user?.id || 'unknown',
      action: 'ANALYZE_PROJECT',
      details: `Project ID: ${project.project_id}`
    });
    res.json(project);
  } catch (error: any) {
    console.error('Error analyzing project:', error);
    res.status(500).json({ message: 'Error analyzing project' });
  }
});

// Feature #9: Fairness-Gap Checker API Route
router.post('/:id/fairness', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const project = await Project.findOne({ project_id: req.params.id });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
    
    // Construct the payload expected by Python's FairnessCheckInput
    const payload = {
      district: project.district,
      project_type: project.project_type,
      compensation_assessed_inr: project.compensation_assessed_inr,
      land_area_hectares: project.land_area_hectares,
      project_id: project.project_id
    };

    const pythonResponse = await axios.post(`${fastApiUrl}/fairness-check`, payload);
    
    // The python service returns {"fairness_report": {...}} or {"fairness_report": null}
    res.json(pythonResponse.data);
  } catch (error: any) {
    console.error('Error fetching fairness check:', error.response?.data || error.message);
    res.status(500).json({ message: 'Error fetching fairness check' });
  }
});

// Legal RAG Proxy Routes
router.post('/legal/upload', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
    res.status(501).json({ message: 'Upload directly to FastAPI at :8000/legal/upload' });
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
});

router.post('/legal/chat', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
    const pythonResponse = await axios.post(`${fastApiUrl}/legal/chat`, req.body);
    res.json(pythonResponse.data);
  } catch (error: any) {
    console.error('Error fetching legal chat:', error.response?.data || error.message);
    res.status(500).json({ message: 'Error fetching legal chat' });
  }
});

router.get('/:id/explain', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const project = await Project.findOne({ project_id: req.params.id });
    if (!project) return res.status(404).json({ message: 'Not found' });
    
    let delayDrivers = [];
    try {
      const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
      const pythonPayload = {
         state: project.state,
         district: project.district,
         latitude: project.latitude,
         longitude: project.longitude,
         project_type: project.project_type,
         implementing_department: project.implementing_department,
         land_area_hectares: project.land_area_hectares,
         families_affected: project.families_affected,
         compensation_assessed_inr: project.compensation_assessed_inr,
         compensation_disbursed_pct: project.compensation_disbursed_pct,
         legal_disputes_count: project.legal_disputes_count,
         notification_date: project.notification_date ? new Date(project.notification_date).toISOString().split('T')[0] : "2024-01-10",
         approval_stage: project.approval_stage || "Stage 3 of 5",
         rr_progress_pct: project.rr_progress_pct || 0,
         stakeholder_responsiveness: project.stakeholder_responsiveness || "Medium",
         historical_dept_avg_delay_days: project.historical_dept_avg_delay_days || 210,
         last_activity_date: project.last_activity_date ? new Date(project.last_activity_date).toISOString().split('T')[0] : "2026-08-01",
         project_budget: project.project_budget || 0
      };
      
      const response = await axios.post(`${fastApiUrl}/explain`, pythonPayload);
      const shapDrivers = response.data.top_shap_drivers || [];
      
      const mapping: any = {
        'legal_disputes_count': 'legal',
        'compensation_disbursed_pct': 'compensation',
        'compensation_assessed_inr': 'compensation',
        'rr_progress_pct': 'rr',
        'approval_stage_num': 'approval',
        'stakeholder_responsiveness': 'objection',
        'implementing_department': 'coordination',
      };
      
      delayDrivers = shapDrivers.map((d: any) => ({
        key: mapping[d.raw_feature] || 'documentation',
        label: d.feature,
        // UI expects a 0-100 scale impact value for the radar chart
        impact: Math.min(100, Math.max(10, Math.abs(d.shap_value) * 100))
      }));
      
    } catch (pythonError: any) {
      console.error("Failed to fetch SHAP explain:", pythonError.message);
      delayDrivers = Array.isArray(project.top_shap_drivers) 
        ? project.top_shap_drivers.map(d => ({ key: d, label: d, impact: 10 }))
        : [];
    }
      
    res.json({ id: project.project_id, delayDrivers });
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
});

router.get('/:id/recommend', authenticate, async (req: AuthRequest, res: any) => {
  try {
    const project = await Project.findOne({ project_id: req.params.id });
    if (!project) return res.status(404).json({ message: 'Not found' });
    
    try {
      const fastApiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
      const pythonPayload = {
         state: project.state,
         district: project.district,
         latitude: project.latitude,
         longitude: project.longitude,
         project_type: project.project_type,
         implementing_department: project.implementing_department,
         land_area_hectares: project.land_area_hectares,
         families_affected: project.families_affected,
         compensation_assessed_inr: project.compensation_assessed_inr,
         compensation_disbursed_pct: project.compensation_disbursed_pct,
         legal_disputes_count: project.legal_disputes_count,
         notification_date: project.notification_date ? new Date(project.notification_date).toISOString().split('T')[0] : "2024-01-10",
         approval_stage: project.approval_stage || "Stage 3 of 5",
         rr_progress_pct: project.rr_progress_pct || 0,
         stakeholder_responsiveness: project.stakeholder_responsiveness || "Medium",
         historical_dept_avg_delay_days: project.historical_dept_avg_delay_days || 210,
         last_activity_date: project.last_activity_date ? new Date(project.last_activity_date).toISOString().split('T')[0] : "2026-08-01",
         project_budget: project.project_budget || 0
      };
      
      const response = await axios.post(`${fastApiUrl}/recommend`, pythonPayload);
      const data = response.data;
      
      const recommendedAction = data.recommended_actions?.[0]?.recommendation || "Continue monitoring timeline progress.";
      const historicalEvidence = data.historical_evidence || {
        avgBudgetOverrunPct: 15,
        shelvingRatePct: 5,
        sampleSize: 12,
      };
      const estimatedCostOverrun = data.budget_impact?.estimated_cost_overrun || 0;
      
      return res.json({
        id: project.project_id,
        recommendedAction,
        historicalEvidence: {
          avgBudgetOverrunPct: historicalEvidence.avg_budget_overrun_pct || historicalEvidence.avgBudgetOverrunPct,
          shelvingRatePct: historicalEvidence.shelving_rate_pct || historicalEvidence.shelvingRatePct,
          sampleSize: historicalEvidence.sample_size || historicalEvidence.sampleSize,
        },
        estimatedCostOverrun
      });
      
    } catch (pythonError: any) {
      console.error("Failed to fetch SHAP recommend:", pythonError.message);
      // Fallback
      const risk = project.predicted_risk_pct || 0;
      const recommendedAction = project.recommended_action || (risk > 65 ? "Prioritize resolving legal disputes and expedite compensation disbursal." : "Continue monitoring timeline progress.");
      
      return res.json({
        id: project.project_id,
        recommendedAction,
        historicalEvidence: {
          avgBudgetOverrunPct: 15,
          shelvingRatePct: 5,
          sampleSize: 12,
        },
        estimatedCostOverrun: 0
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
});

export default router;

