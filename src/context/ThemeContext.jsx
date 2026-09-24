import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { THEMES, HEADER } from "../theme/tokens";

const ThemeContext = createContext(null);
const STORAGE_KEY = "predixa-theme";

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    if (typeof window === "undefined") return "light";
    return localStorage.getItem(STORAGE_KEY) || "light";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      colors: THEMES[mode],
      header: HEADER,
      toggle: () => setMode((m) => (m === "light" ? "dark" : "light")),
      setMode,
    }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
