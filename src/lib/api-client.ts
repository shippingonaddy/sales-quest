// ─── API client ───────────────────────────────────────────────────────────────
// Phase 2: Typed fetcher functions for all backend actions.
// All URLs use the existing ?action= dispatch pattern — do not change.

import { API_ENDPOINT } from "./constants";
import type { CommissionSettings } from "../types";
import type { Sale, Bonus, GameState } from "../types";

export type { API_ENDPOINT };

type AuthHeaders = () => Promise<HeadersInit>;

function jsonHeaders(headers: HeadersInit): HeadersInit {
  return { ...(headers as Record<string, string>), "Content-Type": "application/json" };
}

export async function fetchSettings(
  getAuthHeaders: AuthHeaders,
): Promise<CommissionSettings | null> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_ENDPOINT}?action=get_settings`, { headers });
  if (!res.ok) throw new Error(`get_settings: HTTP ${res.status}`);
  const result = await res.json();
  if (result.success && result.settings) return result.settings as CommissionSettings;
  return null;
}

export async function fetchBonuses(
  getAuthHeaders: AuthHeaders,
  selectedMonth: string,
  currentMonth: string,
): Promise<Bonus[]> {
  const headers = await getAuthHeaders();
  const monthParam = selectedMonth !== currentMonth ? `&month=${selectedMonth}` : "";
  const res = await fetch(`${API_ENDPOINT}?action=get_bonuses${monthParam}`, { headers });
  if (!res.ok) throw new Error(`get_bonuses: HTTP ${res.status}`);
  const result = await res.json();
  if (result.success && result.bonuses) return result.bonuses as Bonus[];
  return [];
}

export interface MonthsResult {
  months: string[];
  currentMonth: string;
}

export async function fetchMonths(
  getAuthHeaders: AuthHeaders,
  signal?: AbortSignal,
): Promise<MonthsResult> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_ENDPOINT}?action=list_months`, { headers, signal });
  if (!res.ok) throw new Error(`list_months: HTTP ${res.status}`);
  const result = await res.json();
  if (!result.success) throw new Error("list_months: server returned success=false");
  return { months: result.months ?? [], currentMonth: result.currentMonth };
}

export interface MonthDataResult {
  data: GameState;
  isArchived: boolean;
  currentMonth: string;
}

export async function fetchMonthData(
  getAuthHeaders: AuthHeaders,
  selectedMonth: string,
  currentMonth: string,
): Promise<MonthDataResult> {
  const headers = await getAuthHeaders();
  const url = selectedMonth === currentMonth ? API_ENDPOINT : `${API_ENDPOINT}?month=${selectedMonth}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`fetch_month_data: HTTP ${res.status}`);
  const result = await res.json();
  if (!result.success || !result.data) throw new Error("fetch_month_data: no data");
  return {
    data: result.data as GameState,
    isArchived: result.isArchived ?? false,
    currentMonth: result.currentMonth,
  };
}

export interface SaveMonthResult {
  data: GameState;
  isArchived: boolean;
  currentMonth: string;
}

export async function saveMonthData(
  getAuthHeaders: AuthHeaders,
  sales: Sale[],
  lastModifiedTime?: number,
): Promise<SaveMonthResult> {
  const headers = await getAuthHeaders();
  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: jsonHeaders(headers),
    body: JSON.stringify({ sales, lastModifiedTime }),
  });
  if (res.status === 409) {
    const err = new Error("conflict") as Error & { status: number };
    err.status = 409;
    throw err;
  }
  if (!res.ok) throw new Error(`save_month_data: HTTP ${res.status}`);
  const result = await res.json();
  if (!result.success || !result.data) throw new Error("save_month_data: no data");
  return {
    data: result.data as GameState,
    isArchived: result.isArchived ?? false,
    currentMonth: result.currentMonth,
  };
}

export async function saveSettings(
  getAuthHeaders: AuthHeaders,
  settings: CommissionSettings,
): Promise<void> {
  const headers = await getAuthHeaders();
  await fetch(`${API_ENDPOINT}?action=save_settings`, {
    method: "POST",
    headers: jsonHeaders(headers),
    body: JSON.stringify(settings),
  });
}

export async function saveBonus(
  getAuthHeaders: AuthHeaders,
  bonus: Bonus,
  currentMonth: string,
): Promise<void> {
  const headers = await getAuthHeaders();
  await fetch(`${API_ENDPOINT}?action=save_bonus&month=${currentMonth}`, {
    method: "POST",
    headers: jsonHeaders(headers),
    body: JSON.stringify(bonus),
  });
}

export async function deleteBonus(
  getAuthHeaders: AuthHeaders,
  id: string,
  currentMonth: string,
): Promise<void> {
  const headers = await getAuthHeaders();
  await fetch(`${API_ENDPOINT}?action=delete_bonus&month=${currentMonth}`, {
    method: "POST",
    headers: jsonHeaders(headers),
    body: JSON.stringify({ id }),
  });
}

export async function fetchAllTimeTotal(
  getAuthHeaders: AuthHeaders,
): Promise<number> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_ENDPOINT}?action=all_time_total`, { headers });
  if (!res.ok) throw new Error(`all_time_total: HTTP ${res.status}`);
  const result = await res.json();
  if (!result.success) throw new Error("all_time_total: server returned success=false");
  return result.total as number;
}
