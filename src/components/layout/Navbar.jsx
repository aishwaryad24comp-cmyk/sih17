import { Landmark, Radio, Scale, LogOut } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import ThemeToggle from "../shared/ThemeToggle";
import { useAuth } from "../../context/AuthContext";

const BASE_TABS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "gis", label: "GIS Insights" },
  { key: "myProjects", label: "My Projects" }
];

export default function Navbar({ active, onNavigate, realtimeStatus }) {
  const { header } = useTheme();
  const { user, logout } = useAuth();
  
  const TABS = [...BASE_TABS];
  if (user?.role === 'Admin') {
    TABS.push({ key: "users", label: "User Management" });
  }

  const statusMap = {
    connected: { label: "Live", color: "#4ade80" },
    connecting: { label: "Connecting", color: header.accent },
    simulated: { label: "Live (simulated)", color: header.accent },
    disconnected: { label: "Reconnecting", color: "#f0574a" },
    error: { label: "Offline", color: "#f0574a" },
  };
  const s = statusMap[realtimeStatus] || statusMap.simulated;

  return (
    <header
      className="sticky top-0 z-50 border-b shadow-md backdrop-blur-md"
      style={{ backgroundColor: header.bg, borderColor: header.border }}
    >
      <div className="max-w-[1400px] mx-auto px-5 h-16 flex items-center justify-between gap-6">
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ backgroundColor: header.bgSoft, color: header.accent }}
          >
            <Landmark size={17} />
          </div>
          <div className="leading-tight">
            <div className="font-slab font-bold text-[15px]" style={{ color: header.text }}>
              PrediXa
            </div>
            <div className="font-mono text-[9px] tracking-widest" style={{ color: header.textMuted }}>
              LAND ACQUISITION REGISTRY
            </div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1 flex-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => onNavigate(t.key)}
              className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              style={{
                color: active === t.key ? header.bg : header.textMuted,
                backgroundColor: active === t.key ? header.accent : "transparent",
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-1.5 font-mono text-[11px]" style={{ color: header.textMuted }}>
            <Radio size={12} style={{ color: s.color }} className={realtimeStatus === "connected" || realtimeStatus === "simulated" ? "animate-pulse" : ""} />
            {s.label}
          </div>
          <ThemeToggle />
          
          <div className="flex items-center gap-3 pl-2 border-l" style={{ borderColor: header.border }}>
            <div className="text-right hidden sm:block">
              <div className="text-xs font-medium" style={{ color: header.text }}>
                {user?.username || 'Guest'}
              </div>
              <div className="font-mono text-[10px]" style={{ color: header.textMuted }}>
                {user?.role || 'Viewer'}
              </div>
            </div>
            <button 
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-500 transition-colors"
              style={{ color: header.textMuted }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
      <nav className="md:hidden flex items-center gap-1 px-5 pb-2" style={{ borderColor: header.border }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => onNavigate(t.key)}
            className="px-3 py-1.5 rounded-md text-xs font-medium"
            style={{
              color: active === t.key ? header.bg : header.textMuted,
              backgroundColor: active === t.key ? header.accent : "transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
