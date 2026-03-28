// ─── Shared types ─────────────────────────────────────────────────────────────
// Extracted from SalesQuest.tsx (Phase 0). Single source of truth for all domain types.

export type ToastVariant = "success" | "error" | "info";
export interface Toast { id: number; message: string; variant: ToastVariant; }

export interface CommissionSnapshot {
  type: "flat" | "flat_plus_down" | "front_back_percent";
  flatAmount: number;
  flatBase: number;
  downPercent: number;
  frontendPercent: number;
  backendPercent: number;
}

export interface Sale {
  id: string;
  date: string;
  customer: string;
  stockNumber?: string;
  year?: string;
  make?: string;
  model?: string;
  downPayment: number;
  frontGross: number;
  backGross: number;
  split: boolean;
  notes: string;
  commissionSnapshot?: CommissionSnapshot;
}

export interface Bonus {
  id: string;
  date: string;
  amount: number;
  label: string;
}

export interface GameState {
  sales: Sale[];
  lastActiveDate: string;
  streak?: number;
  lastModifiedTime?: number;
}

export interface CommissionSettings {
  type: "flat" | "flat_plus_down" | "front_back_percent";
  flatAmount: number;
  flatBase: number;
  downPercent: number;
  frontendPercent: number;
  backendPercent: number;
  payPeriodType: "weekly" | "biweekly";
  payPeriodStart: string;
  configured: boolean;
}

export type Screen = "home" | "badges" | "backup" | "settings" | "diagnostic";
