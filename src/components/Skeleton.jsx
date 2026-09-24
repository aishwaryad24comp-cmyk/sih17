import React from "react";
import { useTheme } from "../context/ThemeContext";

/**
 * A single pulsing placeholder block. Used per-panel instead of one
 * full-page blocking spinner, so the rest of the dashboard stays
 * interactive while a slower resource (e.g. live API network calls)
 * is still loading.
 */
export function Skeleton({ className = "", style = {} }) {
  const { C } = useTheme();
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse ${className}`}
      style={{ background: C.paperLine, borderRadius: 3, ...style }}
    />
  );
}
