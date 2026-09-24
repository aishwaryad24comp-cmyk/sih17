import { useTheme } from "../../context/ThemeContext";

export default function SectionHeader({ index, eyebrow, title, icon: Icon, right }) {
  const { colors } = useTheme();
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <div
          className="flex items-center gap-2 font-mono text-xs font-semibold tracking-widest mb-1"
          style={{ color: colors.accent }}
        >
          {Icon && <Icon size={14} />}
          <span>
            {index} · {eyebrow}
          </span>
        </div>
        <h2 className="font-slab text-xl font-semibold" style={{ color: colors.text }}>
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}
