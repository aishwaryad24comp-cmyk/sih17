// Palette tokens consumed via useTheme(). Components read colors from
// here rather than hardcoding Tailwind classes, so the whole UI can
// retheme at runtime. HEADER is intentionally NOT part of THEMES: the
// top bar and chart tooltips stay a fixed dark "ledger stamp" bar in
// both modes so they never invert into a mismatched light bar.

export const HEADER = {
  bg: "#0f1b2e",
  bgSoft: "#1c2b42",
  border: "#2c3b57",
  text: "#f7f8fa",
  textMuted: "#94a3b8",
  accent: "#f0a733",
};

export const THEMES = {
  light: {
    name: "light",
    page: "#f1f4f8",
    surface: "#ffffff",
    surfaceMuted: "#f7f8fa",
    border: "#e2e8f0",
    borderStrong: "#cbd5e1",
    text: "#0f1b2e",
    textMuted: "#64748b",
    textFaint: "#94a3b8",
    accent: "#d97706",
    accentSoft: "#fdf0dc",
    risk: {
      high: "#c02a1f",
      highBg: "#fbe7e5",
      medium: "#c2660a",
      mediumBg: "#faedd9",
      low: "#1e7a44",
      lowBg: "#e2f3e6",
    },
    chartGrid: "#e2e8f0",
    chartAxis: "#94a3b8",
  },
  dark: {
    name: "dark",
    page: "#0b1220",
    surface: "#101a2c",
    surfaceMuted: "#0d1729",
    border: "#22314a",
    borderStrong: "#2c3b57",
    text: "#f1f4f8",
    textMuted: "#94a3b8",
    textFaint: "#64748b",
    accent: "#f0a733",
    accentSoft: "#26200f",
    risk: {
      high: "#f0574a",
      highBg: "#2c1512",
      medium: "#f0a733",
      mediumBg: "#2b1f0d",
      low: "#4ade80",
      lowBg: "#12261a",
    },
    chartGrid: "#22314a",
    chartAxis: "#64748b",
  },
};
