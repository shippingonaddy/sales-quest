import { useQuery } from "@tanstack/react-query";
import {
  fetchSettings,
  fetchBonuses,
  fetchMonths,
  fetchMonthData,
  fetchAllTimeTotal,
} from "../lib/api-client";
import type { CommissionSettings, Bonus, GameState } from "../types";

type AuthHeaders = () => Promise<HeadersInit>;

// ─── Query keys ──────────────────────────────────────────────────────────────

export const queryKeys = {
  settings: ["settings"] as const,
  months: ["months"] as const,
  monthData: (month: string) => ["month-data", month] as const,
  bonuses: (month: string) => ["bonuses", month] as const,
  allTimeTotal: ["all-time-total"] as const,
};

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useSettingsQuery(
  getAuthHeaders: AuthHeaders,
  enabled: boolean,
) {
  return useQuery<CommissionSettings | null>({
    queryKey: queryKeys.settings,
    queryFn: () => fetchSettings(getAuthHeaders),
    enabled,
    staleTime: Infinity, // settings rarely change; only invalidate on save
  });
}

export function useMonthsQuery(
  getAuthHeaders: AuthHeaders,
  enabled: boolean,
) {
  return useQuery({
    queryKey: queryKeys.months,
    queryFn: ({ signal }) => fetchMonths(getAuthHeaders, signal),
    enabled,
  });
}

export function useMonthDataQuery(
  getAuthHeaders: AuthHeaders,
  selectedMonth: string,
  currentMonth: string,
  enabled: boolean,
) {
  return useQuery<{ data: GameState; isArchived: boolean; currentMonth: string }>({
    queryKey: queryKeys.monthData(selectedMonth),
    queryFn: () => fetchMonthData(getAuthHeaders, selectedMonth, currentMonth),
    enabled: enabled && !!selectedMonth,
  });
}

export function useBonusesQuery(
  getAuthHeaders: AuthHeaders,
  selectedMonth: string,
  currentMonth: string,
  enabled: boolean,
) {
  return useQuery<Bonus[]>({
    queryKey: queryKeys.bonuses(selectedMonth),
    queryFn: () => fetchBonuses(getAuthHeaders, selectedMonth, currentMonth),
    enabled: enabled && !!selectedMonth,
  });
}

export function useAllTimeTotalQuery(
  getAuthHeaders: AuthHeaders,
  enabled: boolean,
) {
  return useQuery<number>({
    queryKey: queryKeys.allTimeTotal,
    queryFn: () => fetchAllTimeTotal(getAuthHeaders),
    enabled,
  });
}
