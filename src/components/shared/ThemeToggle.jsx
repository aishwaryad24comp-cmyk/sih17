import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function ThemeToggle() {
  const { mode, toggle, header } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="flex items-center justify-center w-8 h-8 rounded-md border transition-colors"
      style={{ borderColor: header.border, color: header.textMuted }}
    >
      {mode === "light" ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}
