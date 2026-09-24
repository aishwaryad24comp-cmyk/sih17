import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useRealtimeUpdates } from "../../hooks/useRealtimeUpdates";
import { useSocket } from "../../hooks/useSocket";
import { ShieldAlert } from "lucide-react";
import Navbar from "./Navbar";
import DashboardPage from "../../pages/DashboardPage";
import MyProjectsPage from "../../pages/MyProjectsPage";
import AddProjectPage from "../../pages/AddProjectPage";
import GisInsightsPage from "../../pages/GisInsightsPage";
import LandownerPortalPage from "../../pages/LandownerPortalPage";
import AdminSettingsPage from "../../pages/AdminSettingsPage";
import LegalAssistantWidget from "../LegalAssistantWidget";
export default function DashboardLayout() {
  const { colors } = useTheme();
  const { status } = useRealtimeUpdates();
  const { latestAlert, clearAlert } = useSocket();
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="min-h-screen relative overflow-x-clip" style={{ backgroundColor: colors.page }}>
      <Navbar active={tab} onNavigate={setTab} realtimeStatus={status} />
      <main className="px-5 py-6">
        {tab === "dashboard" && <DashboardPage />}
        {tab === "gis" && <GisInsightsPage />}
        {tab === "myProjects" && <MyProjectsPage />}
        {tab === "addProject" && <AddProjectPage />}
        {tab === "landowner" && <LandownerPortalPage />}
        {tab === "users" && <AdminSettingsPage />}
      </main>

      {/* SOCKET LIVE ALERT TOAST */}
      {latestAlert && (
        <div 
          className="fixed bottom-6 right-6 z-50 p-4 border rounded shadow-2xl max-w-sm"
          style={{ background: '#361818', borderColor: colors.border }}
        >
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-2 mb-2 text-red-500 font-bold uppercase tracking-wider text-sm">
              <ShieldAlert size={18} />
              <span>LIVE SYSTEM ALERT</span>
            </div>
            <button onClick={clearAlert} className="text-slate-400 hover:text-white">&times;</button>
          </div>
          <p className="text-white text-sm">
            {latestAlert.message}
          </p>
          <p className="text-slate-400 text-xs mt-2 font-mono uppercase">
            Project: {latestAlert.projectName}
          </p>
        </div>
      )}

      <LegalAssistantWidget />
    </div>
  );
}
