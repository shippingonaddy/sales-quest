import type { SupabaseClient } from "@supabase/supabase-js";
import type { MonthlyData, Sale, Bonus } from "./types";

const FALLBACK_TZ = 'America/Chicago';

// ─── Pure helpers (no I/O) ────────────────────────────────────────────────────

export function resolveTimezone(raw: string | null | undefined): string {
  if (!raw) return FALLBACK_TZ;
  try { Intl.DateTimeFormat(undefined, { timeZone: raw }); return raw; }
  catch { return FALLBACK_TZ; }
}

function getUserDateParts(date: Date, tz: string): { year: string; month: string; day: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return { year: map.year, month: map.month, day: map.day };
}

export function getCurrentMonth(tz: string): string {
  const { year, month } = getUserDateParts(new Date(), tz);
  return `${year}-${month}`;
}

export function formatDate(date: Date, tz: string): string {
  const { year, month, day } = getUserDateParts(date, tz);
  return `${year}-${month}-${day}`;
}

const isWorkDay = (date: Date): boolean => {
  const d = date.getDay();
  return d !== 0 && d !== 3;
};

const getPrevWorkDay = (date: Date): Date => {
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 1);
  while (!isWorkDay(prev)) prev.setDate(prev.getDate() - 1);
  return prev;
};

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function getSettings(
  client: SupabaseClient
): Promise<Record<string, unknown> | null> {
  const { data } = await client.from("settings").select("data").maybeSingle();
  return data ? (data.data as Record<string, unknown>) : null;
}

export async function saveSettings(
  client: SupabaseClient,
  userId: string,
  settings: unknown
): Promise<void> {
  const { error } = await client
    .from("settings")
    .upsert({ user_id: userId, data: settings }, { onConflict: "user_id" });
  if (error) throw new Error(`saveSettings failed: ${error.message}`);
}

// ─── Monthly data ─────────────────────────────────────────────────────────────

export async function getMonthData(
  client: SupabaseClient,
  month: string,
  tz: string
): Promise<MonthlyData | null> {
  const { data } = await client
    .from("monthly_data").select("*").eq("month", month).maybeSingle();
  if (!data) return null;
  return {
    schemaVersion: (data.schema_version as number) ?? 1,
    month: data.month as string,
    sales: (data.sales as Sale[]) ?? [],
    lastActiveDate: (data.last_active_date as string) ?? formatDate(new Date(), tz),
    streak: (data.streak as number) ?? 0,
    lastModifiedTime: (data.last_modified_time as number) ?? 0,
  };
}

export async function upsertMonthData(
  client: SupabaseClient,
  userId: string,
  monthData: MonthlyData
): Promise<void> {
  const { error } = await client.from("monthly_data").upsert({
    user_id: userId,
    month: monthData.month,
    sales: monthData.sales,
    last_active_date: monthData.lastActiveDate,
    streak: monthData.streak ?? 0,
    last_modified_time: monthData.lastModifiedTime ?? Date.now(),
    schema_version: monthData.schemaVersion ?? 1,
  }, { onConflict: "user_id,month" });
  if (error) throw new Error(`upsertMonthData failed: ${error.message}`);
}

export async function listMonths(
  client: SupabaseClient,
  currentMonth: string
): Promise<string[]> {
  const { data } = await client
    .from("monthly_data").select("month").order("month", { ascending: false });
  const months = (data ?? []).map((r: { month: string }) => r.month);
  if (!months.includes(currentMonth)) months.unshift(currentMonth);
  return months;
}

// ─── Bonuses ──────────────────────────────────────────────────────────────────

type BonusRow = { id: string; date: string; amount: number; label: string };

export async function getBonuses(
  client: SupabaseClient,
  month: string
): Promise<Bonus[]> {
  const { data } = await client
    .from("bonuses").select("id, date, amount, label")
    .eq("month", month).order("date", { ascending: true });
  return (data ?? []).map((r: BonusRow) => ({
    id: r.id, date: r.date, amount: Number(r.amount), label: r.label,
  }));
}

export async function saveBonus(
  client: SupabaseClient,
  userId: string,
  month: string,
  bonus: Bonus
): Promise<Bonus[]> {
  const { error } = await client.from("bonuses").insert({
    id: bonus.id, user_id: userId, month,
    date: bonus.date, amount: bonus.amount, label: bonus.label,
  });
  if (error) throw new Error(`saveBonus failed: ${error.message}`);
  return getBonuses(client, month);
}

export async function deleteBonus(
  client: SupabaseClient,
  month: string,
  bonusId: string
): Promise<Bonus[]> {
  const { error } = await client.from("bonuses").delete().eq("id", bonusId);
  if (error) throw new Error(`deleteBonus failed: ${error.message}`);
  return getBonuses(client, month);
}

// ─── All-time total ───────────────────────────────────────────────────────────

export async function getAllMonthSales(
  client: SupabaseClient
): Promise<{ month: string; sales: Sale[] }[]> {
  const { data } = await client.from("monthly_data").select("month, sales");
  return (data ?? []).map((r: { month: string; sales: unknown }) => ({
    month: r.month, sales: (r.sales as Sale[]) ?? [],
  }));
}

// ─── Streak ───────────────────────────────────────────────────────────────────

export async function calculateStreak(
  client: SupabaseClient,
  currentMonthData: MonthlyData,
  tz: string
): Promise<number> {
  const allDates = new Set<string>();
  currentMonthData.sales.forEach(s => allDates.add(s.date));

  // Load previous month to preserve cross-month streaks
  const [yearStr, monthStr] = currentMonthData.month.split('-');
  let prevYear = parseInt(yearStr);
  let prevMonth = parseInt(monthStr) - 1;
  if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }
  const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  const prevData = await getMonthData(client, prevMonthStr, tz);
  if (prevData) prevData.sales.forEach(s => allDates.add(s.date));

  if (allDates.size === 0) return 0;

  const todayStr = formatDate(new Date(), tz);
  let currentDay = new Date();

  if (!allDates.has(todayStr)) {
    const yesterday = getPrevWorkDay(currentDay);
    if (!allDates.has(formatDate(yesterday, tz))) return 0;
    currentDay = yesterday;
  }

  let streak = 0;
  let iterations = 0;
  while (iterations < 365) {
    iterations++;
    const dayStr = formatDate(currentDay, tz);
    if (allDates.has(dayStr)) { streak++; currentDay = getPrevWorkDay(currentDay); }
    else if (!isWorkDay(currentDay)) { currentDay.setDate(currentDay.getDate() - 1); }
    else break;
  }
  return streak;
}
