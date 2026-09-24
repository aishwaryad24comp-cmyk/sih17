import { useEffect, useRef, useState } from "react";

/**
 * Animates the numeric portion of a KPI value on mount/change, keeping
 * any surrounding text (e.g. "91%", "12d") intact. Falls back to
 * rendering the raw value immediately if it has no numeric part.
 */
export function useCountUp(value, duration = 600) {
  const isPlainNumber = typeof value === "number";
  const match = isPlainNumber ? null : typeof value === "string" ? value.match(/-?\d+(\.\d+)?/) : null;
  const target = isPlainNumber ? value : match ? parseFloat(match[0]) : null;
  const prefix = isPlainNumber ? "" : match ? String(value).slice(0, match.index) : "";
  const suffix = isPlainNumber ? "" : match ? String(value).slice(match.index + match[0].length) : "";

  const [display, setDisplay] = useState(target ?? 0);
  const frame = useRef(null);

  useEffect(() => {
    if (target == null) return;
    const start = performance.now();
    const from = 0;

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(from + (target - from) * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    }
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  if (target == null) return value;
  const rounded = Number.isInteger(target) ? Math.round(display) : Math.round(display * 10) / 10;
  return `${prefix}${rounded}${suffix}`;
}
