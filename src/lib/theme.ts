// ─── Theme tokens ─────────────────────────────────────────────────────────────
// Extracted from SalesQuest.tsx (Phase 0).

export const C = {
  cyan: "#00f2ff",
  purple: "#7f13ec",
  pink: "#ff00e5",
  amber: "#f59e0b",
  orange: "#f97316",
  violet: "#a78bfa",
  green: "#10b981",
  red: "#ef4444",
};

const _hexRgbCache = new Map<string, string>();

export const hexToRgb = (hex: string): string => {
  const cached = _hexRgbCache.get(hex);
  if (cached) return cached;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const result = `${r}, ${g}, ${b}`;
  _hexRgbCache.set(hex, result);
  return result;
};

// Pre-computed RGB strings — avoids repeated parseInt on every render
export const RGB = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, hexToRgb(v)])) as Record<keyof typeof C, string>;

export const glassCard = (hex: string, alpha = 0.07) => {
  const rgb = hexToRgb(hex);
  return {
    background: `rgba(${rgb}, ${alpha})`,
    border: `1px solid rgba(${rgb}, 0.45)`,
    boxShadow: `0 0 18px rgba(${rgb}, 0.18), inset 0 1px 0 rgba(${rgb}, 0.12)`,
    borderRadius: 14,
  };
};

// Pre-computed glass styles for each token color — avoids recalculating on every render
export const GLASS = Object.fromEntries(Object.entries(C).map(([k, v]) => [k, glassCard(v)])) as Record<keyof typeof C, ReturnType<typeof glassCard>>;
