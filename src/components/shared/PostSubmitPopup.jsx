import { useEffect } from "react";
import { CheckCircle2, ShieldAlert, X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

// Feature #17 — confirms what just happened after a submit action, and
// surfaces any role/domain-scoped access notice relevant to the current
// user (e.g. an Official is reminded their edit access is scoped to
// projects they created, once Member 6's ownership middleware is live).
export default function PostSubmitPopup({ open, onClose, title, message, accessNotice, autoCloseMs = 6000 }) {
  const { colors } = useTheme();

  useEffect(() => {
    if (!open || !autoCloseMs) return;
    const t = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(t);
  }, [open, autoCloseMs, onClose]);

  if (!open) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm animate-[fadeSlideUp_0.25s_ease-out]">
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        className="rounded-lg border shadow-xl overflow-hidden"
        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
      >
        <div className="flex items-start gap-3 p-4">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0" style={{ color: colors.risk.low }} />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm" style={{ color: colors.text }}>
              {title}
            </div>
            <div className="text-sm mt-0.5" style={{ color: colors.textMuted }}>
              {message}
            </div>
          </div>
          <button onClick={onClose} aria-label="Dismiss" style={{ color: colors.textFaint }}>
            <X size={16} />
          </button>
        </div>
        {accessNotice && (
          <div
            className="flex items-start gap-2 px-4 py-3 border-t text-xs"
            style={{ borderColor: colors.border, backgroundColor: colors.accentSoft, color: colors.textMuted }}
          >
            <ShieldAlert size={14} className="mt-0.5 shrink-0" style={{ color: colors.accent }} />
            <span>{accessNotice}</span>
          </div>
        )}
      </div>
    </div>
  );
}
