# PREDIXA — Predictive Land Acquisition & Risk Management Platform

PREDIXA is an enterprise-grade AI-powered platform for identifying, analyzing, and mitigating delays in government and private land acquisition projects across India. It provides real-time risk intelligence, GIS spatial overlap detection, automated email alerting, SHAP-based ML delay explainability, and legal compliance assistants.

---

## 🌟 Key Features

1. **Interactive Risk Intelligence Dashboard**
   - Live KPI cards tracking total projects, high-risk delays, financial exposure, and average acquisition lead times.
   - Dynamic Risk Register with per-project delay drivers, timeline projections, and state/district comparative analytics.
   - Stage-wise lifecycle completion and department risk distribution breakdown.

2. **GIS Spatial & Overlap Intelligence**
   - Interactive Leaflet GIS maps featuring district project boundary overlays.
   - Automated spatial overlap detection to catch land rights conflicts before execution.
   - Silent stall detection identifying stagnant projects stuck in administrative bottlenecks.

3. **CSV Bulk Upload & Automated Validation**
   - Bulk upload project data via CSV files (`.csv`).
   - Strict schema validation, duplicate check, and instant risk scoring upon intake.

4. **Automated High-Risk Email Alert Engine**
   - Triggers real-time email alerts (via Nodemailer) to designated officials when high-risk projects or critical delays are detected or added.

5. **AI Legal Assistant & Regulatory Advisor**
   - Built-in AI assistant providing instant guidance on Indian Land Acquisition Laws (RFCTLARR Act 2013, state amendments, environmental clearances, and court precedents).

6. **Landowner & Public Portal**
   - Transparency portal for land parcel verification, compensation status tracking, and direct query submissions.

7. **Exportable PDF Intelligence Reports**
   - Generates professional executive PDF reports complete with project risk badges, financial breakdown, delay driver breakdown, and mitigation recommendations.

---

## 🏗 System Architecture

PREDIXA is structured into three main micro-components:

```
predixa/
├── src/                               # Frontend: React (Vite) + Tailwind CSS + Lucide Icons
│   ├── api/                           # Axios API Client & Endpoints (landAcquisitionApi.js)
│   ├── components/                    # UI Components, Dashboard Panels & AI Assistant
│   ├── context/                       # Session (Auth/RBAC) and Theme Contexts
│   ├── pages/                         # Dashboard, My Projects, GIS, Landowner, Admin
│   └── utils/                         # PDF Generator (generateProjectReport.js)
├── backend/                           # Backend API: Node.js + Express + TypeScript
│   ├── src/models/                    # Mongoose Models (Project, User, Notification, etc.)
│   ├── src/routes/                    # Auth, Projects, Analytics, Notifications
│   └── src/services/                  # Alert Engine, Email Dispatcher (Nodemailer)
└── ai-model/explainability-service/   # ML Service: Python + FastAPI + SHAP + Gemini
    ├── main.py                        # FastAPI Server (Port 8000)
    ├── explain.py                     # SHAP Feature Explanations
    └── legal_rag.py                   # Land Law Knowledge RAG Service
```

---

## 🚀 Getting Started & Local Testing Guide

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **Python** (3.10+ for ML explainability service, optional for core web app)
- **MongoDB Atlas** database connection string

---

### Step 1: Clone & Install Dependencies

```bash
# 1. Clone the repository
git clone https://github.com/YashGharge016/sih26017.git
cd sih26017

# 2. Install Root Frontend Dependencies
npm install

# 3. Install Backend Dependencies
cd backend
npm install
cd ..
```

---

### Step 2: Environment Configuration

Create two `.env` files locally (do not commit raw secret files to public git):

#### 1. Root `.env` (`./.env`)
```env
VITE_USE_LIVE_API=true
VITE_API_BASE_URL=http://localhost:5000/api
GEMINI_API_KEY=your_gemini_api_key_here  # Optional: For AI Chatbot LLM responses
```

#### 2. Backend `.env` (`./backend/.env`)
```env
PORT=5000
MONGODB_URI=mongodb+srv://yashgharge016:yashgharge016@cluster0.p7dls.mongodb.net/predixa_db?retryWrites=true&w=majority
JWT_SECRET=predixa_secret_key_2026_super_secure
EMAIL_USER=testinggg1216@gmail.com
EMAIL_PASS=rmce oebz xndq eixj
FRONTEND_URL=http://localhost:5173
```

---

### Step 3: Run the Application Locally

Open separate terminal windows:

#### Terminal 1: Backend Express Server
```bash
cd backend
npm run dev
```
*Backend runs at `http://localhost:5000`*

#### Terminal 2: Vite React Frontend
```bash
npm run dev
```
*Frontend runs at `http://localhost:5173`*

#### Terminal 3: (Optional) Python AI Explainability Service
```bash
cd ai-model/explainability-service
pip install -r requirements.txt
uvicorn main:app --port 8000
```
*ML Service runs at `http://localhost:8000`*

---

## 🔑 Default Credentials for Testing

Use these pre-configured user credentials to test role-based access control (RBAC):

| Role | Username | Password | Access Level |
|---|---|---|---|
| **System Admin** | `admin` | `password123` | Full Access, User Management, Audit Logs |
| **Nodal Official** | `official` | `password123` | Project Creation, CSV Upload, My Projects Edit |
| **Landowner** | `landowner` | `password123` | Parcel View, Compensation Tracker |

*(If using a fresh MongoDB cluster, initialize users by running `cd backend && npx ts-node seed_users.ts`)*

---

## 🧪 Verification & Build Commands

- **Frontend Production Build**: `npm run build`
- **Backend TypeScript Build**: `cd backend && npm run build`

---

## 📜 License
PREDIXA Project — All rights reserved.
