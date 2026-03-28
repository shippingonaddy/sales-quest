// ─── Date utilities ───────────────────────────────────────────────────────────
// Extracted from SalesQuest.tsx (Phase 0).

import type { Sale, GameState } from "../types";

export const getLocalDateString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const getCurrentMonth = (): string => getLocalDateString().slice(0, 7);

export const getEmptyState = (): GameState => ({
  sales: [], lastActiveDate: getLocalDateString(),
  streak: 0, lastModifiedTime: Date.now(),
});

export const getYesterday = (): string => {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const isWorkDay = (date: Date): boolean => {
  const day = date.getDay();
  return day !== 0 && day !== 3;
};

export const getPrevWorkDay = (date: Date): Date => {
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 1);
  while (!isWorkDay(prev)) prev.setDate(prev.getDate() - 1);
  return prev;
};

export const getLocalDateStringFromDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const calculateLocalStreakFromSales = (sales: Sale[], today = getLocalDateString()): number => {
  const allDates = new Set(sales.map(sale => sale.date).filter(Boolean));
  if (allDates.size === 0) return 0;

  let currentDay = new Date(`${today}T12:00:00`);
  if (!allDates.has(today)) {
    const previousWorkDay = getPrevWorkDay(currentDay);
    const previousWorkDayStr = getLocalDateStringFromDate(previousWorkDay);
    if (!allDates.has(previousWorkDayStr)) return 0;
    currentDay = previousWorkDay;
  }

  let streak = 0;
  let iterations = 0;
  while (iterations < 365) {
    iterations += 1;
    const dayStr = getLocalDateStringFromDate(currentDay);
    if (allDates.has(dayStr)) {
      streak += 1;
      currentDay = getPrevWorkDay(currentDay);
    } else if (!isWorkDay(currentDay)) {
      currentDay.setDate(currentDay.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};

export const buildLocalStateFromSales = (sales: Sale[]): GameState => {
  const sortedSales = [...sales].sort((a, b) => a.date.localeCompare(b.date));
  const lastActiveDate = sortedSales.length > 0
    ? sortedSales[sortedSales.length - 1].date
    : getLocalDateString();

  return {
    sales,
    lastActiveDate,
    streak: calculateLocalStreakFromSales(sales),
    lastModifiedTime: Date.now(),
  };
};

export const formatMonth = (month: string): string => {
  if (!month) return "";
  const [year, monthNum] = month.split("-");
  const date = new Date(parseInt(year, 10), parseInt(monthNum, 10) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

export const groupSalesByDate = (sales: Sale[]): { label: string; date: string; sales: Sale[] }[] => {
  const today = getLocalDateString();
  const yesterday = getYesterday();
  const map = new Map<string, { label: string; date: string; sales: Sale[] }>();
  [...sales]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .forEach(sale => {
      if (!map.has(sale.date)) {
        let label: string;
        if (sale.date === today) label = "Today";
        else if (sale.date === yesterday) label = "Yesterday";
        else { const d = new Date(sale.date + "T12:00:00"); label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
        map.set(sale.date, { label, date: sale.date, sales: [] });
      }
      map.get(sale.date)!.sales.push(sale);
    });
  return Array.from(map.values());
};
