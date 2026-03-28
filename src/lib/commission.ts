// ─── Commission engine ────────────────────────────────────────────────────────
// Extracted from SalesQuest.tsx (Phase 0). Pure logic — no JSX, no side effects.

import type { Sale, CommissionSettings, CommissionSnapshot, GameState } from "../types";
import { DEFAULT_SETTINGS, XP_PER_LEVEL } from "./constants";

export const computeBase = (sale: Sale, cfg: { type: string; flatAmount: number; flatBase: number; downPercent: number; frontendPercent: number; backendPercent: number }): number => {
  if (cfg.type === "flat") return cfg.flatAmount;
  if (cfg.type === "flat_plus_down") return cfg.flatBase + (sale.downPayment || 0) * (cfg.downPercent / 100);
  if (cfg.type === "front_back_percent") {
    return (sale.frontGross || 0) * (cfg.frontendPercent / 100) + (sale.backGross || 0) * ((cfg.backendPercent || 0) / 100);
  }
  return 0;
};

export const getSaleCommission = (sale: Sale, settings: CommissionSettings): number => {
  const cfg = sale.commissionSnapshot
    ? { ...DEFAULT_SETTINGS, ...sale.commissionSnapshot }
    : settings;
  const base = computeBase(sale, cfg);
  return sale.split ? base / 2 : base;
};

export const calculateRevenue = (sales: Sale[], settings: CommissionSettings): number =>
  sales.reduce((t, s) => t + getSaleCommission(s, settings), 0);

export const createSnapshot = (s: CommissionSettings): CommissionSnapshot => ({
  type: s.type, flatAmount: s.flatAmount, flatBase: s.flatBase,
  downPercent: s.downPercent, frontendPercent: s.frontendPercent, backendPercent: s.backendPercent,
});

export const getPayPeriodRange = (settings: CommissionSettings): { start: string; end: string; label: string } => {
  if (!settings.payPeriodStart) {
    const now = new Date();
    const mStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const mEndStr = `${mEnd.getFullYear()}-${String(mEnd.getMonth() + 1).padStart(2, "0")}-${String(mEnd.getDate()).padStart(2, "0")}`;
    return { start: mStart, end: mEndStr, label: "This month" };
  }
  const periodDays = settings.payPeriodType === "weekly" ? 7 : 14;
  const today = new Date();
  let start = new Date(settings.payPeriodStart + "T00:00:00");
  for (let i = 0; i < 100; i++) {
    const end = new Date(start); end.setDate(end.getDate() + periodDays - 1);
    if (end >= today) {
      const toStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return { start: toStr(start), end: toStr(end), label: `${fmt(start)} – ${fmt(end)}` };
    }
    start.setDate(start.getDate() + periodDays);
  }
  return { start: settings.payPeriodStart, end: settings.payPeriodStart, label: "" };
};

export const calculateXP = (state: GameState): number => {
  let xp = state.sales.reduce((t, s) => t + (s.split ? 25 : 50), 0);
  xp += (state.streak || 0) * 25;
  return xp;
};

export const getLevel = (xp: number): number => Math.floor(xp / XP_PER_LEVEL) + 1;
export const getXPProgress = (xp: number): number => xp % XP_PER_LEVEL;
export const getXPRemaining = (xp: number): number => XP_PER_LEVEL - (xp % XP_PER_LEVEL);
