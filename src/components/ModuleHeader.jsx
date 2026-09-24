import { useTheme } from "../context/ThemeContext";

export default function ModuleHeader({ icon: Icon, title, description, count, countLabel }) {
  const { colors } = useTheme();

  return (
    <div className="border-b px-6 py-5" style={{ borderColor: colors.border }}>
      <div className="flex items-center gap-3 flex-wrap">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-md shrink-0 shadow-sm"
          style={{ backgroundColor: colors.accentSoft, color: colors.accent }}
        >
          {Icon && <Icon size={18} strokeWidth={2} />}
        </div>
        <h1 className="font-display text-lg font-semibold" style={{ color: colors.text }}>
          {title}
        </h1>
        {typeof count === 'number' && (
          <span
            className="ml-auto rounded-full px-3 py-1 font-mono text-xs font-semibold"
            style={{ backgroundColor: colors.accentSoft, color: colors.accent }}
          >
            {count} {countLabel || 'item(s)'}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-2 max-w-3xl text-xs leading-relaxed" style={{ color: colors.textMuted }}>
          {description}
        </p>
      )}
    </div>
  );
}
