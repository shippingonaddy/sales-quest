// ─── Constants ────────────────────────────────────────────────────────────────
// Extracted from SalesQuest.tsx (Phase 0).

import type { CommissionSettings } from "../types";

export const XP_PER_LEVEL = 100;
export const API_ENDPOINT = "/api/sales-quest";
export const RETRY_DELAYS = [500, 1500, 3000];
export const SETTINGS_KEY = "sales_quest_commission_settings_v2";
export const BONUS_KEY = "sales_quest_bonuses_v1";

export const DEFAULT_SETTINGS: CommissionSettings = {
  type: "flat_plus_down",
  flatAmount: 100,
  flatBase: 100,
  downPercent: 10,
  frontendPercent: 25,
  backendPercent: 0,
  payPeriodType: "biweekly",
  payPeriodStart: "",
  configured: false,
};
