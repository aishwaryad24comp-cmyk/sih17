import { useSession } from "../../context/SessionContext";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { LogOut } from "lucide-react";

export default function UserSwitcher() {
  const { user, users, switchUser } = useSession();
  const { header } = useTheme();
  const { logout } = useAuth();
  return (
    <div className="flex items-center gap-2">
      <div className="text-right hidden sm:block">
        <div className="text-xs font-medium" style={{ color: header.text }}>
          {user.name}
        </div>
        <div className="font-mono text-[10px]" style={{ color: header.textMuted }}>
          {user.role} · {user.id}
        </div>
      </div>
      <select
        value={user.id}
        onChange={(e) => switchUser(e.target.value)}
        className="text-xs rounded-md border px-2 py-1.5 bg-transparent"
        style={{ borderColor: header.border, color: header.text, colorScheme: "dark" }}
      >
        {(users || []).map((u) => (
          <option key={u.id} value={u.id} style={{ color: "#0f1b2e" }}>
            {u.name} — {u.role}
          </option>
        ))}
      </select>
      
      <button 
        onClick={logout}
        title="Logout"
        className="p-1.5 ml-1 rounded-md hover:bg-red-500/10 hover:text-red-500 transition-colors"
        style={{ color: header.textMuted }}
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
