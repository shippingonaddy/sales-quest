import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  saveMonthData,
  saveSettings,
  saveBonus,
  deleteBonus,
} from "../lib/api-client";
import { queryKeys } from "./useSalesQueries";
import type { CommissionSettings, Sale, Bonus } from "../types";

type AuthHeaders = () => Promise<HeadersInit>;

// ─── Mutations ────────────────────────────────────────────────────────────────

export interface SaveMonthVariables {
  sales: Sale[];
  lastModifiedTime?: number;
}

export function useSaveMonthMutation(getAuthHeaders: AuthHeaders) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sales, lastModifiedTime }: SaveMonthVariables) =>
      saveMonthData(getAuthHeaders, sales, lastModifiedTime),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allTimeTotal });
    },
  });
}

export function useSaveSettingsMutation(getAuthHeaders: AuthHeaders) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: CommissionSettings) => saveSettings(getAuthHeaders, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
    },
  });
}

export interface SaveBonusVariables {
  bonus: Bonus;
}

export function useSaveBonusMutation(getAuthHeaders: AuthHeaders, currentMonth: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ bonus }: SaveBonusVariables) =>
      saveBonus(getAuthHeaders, bonus, currentMonth),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bonuses(currentMonth) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allTimeTotal });
    },
  });
}

export interface DeleteBonusVariables {
  id: string;
}

export function useDeleteBonusMutation(getAuthHeaders: AuthHeaders, currentMonth: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: DeleteBonusVariables) =>
      deleteBonus(getAuthHeaders, id, currentMonth),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bonuses(currentMonth) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allTimeTotal });
    },
  });
}
