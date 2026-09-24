/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        slab: ['"Roboto Slab"', "ui-serif", "Georgia", "serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        ink: {
          50: "#f7f8fa",
          100: "#f1f4f8",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          700: "#334155",
          800: "#1c2b42",
          900: "#0f1b2e",
          950: "#0b1220",
        },
        amber: {
          400: "#f0a733",
          500: "#d97706",
          600: "#c2660a",
        },
        risk: {
          high: "#c02a1f",
          "high-bg": "#fbe7e5",
          medium: "#c2660a",
          "medium-bg": "#faedd9",
          low: "#1e7a44",
          "low-bg": "#e2f3e6",
        },
      },
    },
  },
  plugins: [],
};
