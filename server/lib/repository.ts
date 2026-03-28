import { promises as fs } from "fs";
import { join } from "path";
import type { MonthlyData } from "./types";

export const BASE_DATA_DIR = process.env.DATA_DIR || '/data/sales-quest';

const FALLBACK_TZ = 'America/Chicago';

export function resolveTimezone(raw: string | null | undefined): string {
  if (!raw) return FALLBACK_TZ;
  try { Intl.DateTimeFormat(undefined, { timeZone: raw }); return raw; }
  catch { return FALLBACK_TZ; }
}

function getUserDateParts(date: Date, tz: string): { year: string; month: string; day: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
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

export function getUserDataDir(userId: string): string {
  return join(BASE_DATA_DIR, userId);
}

export function getCurrentDataPath(userId: string): string {
  return join(getUserDataDir(userId), "current.json");
}

export function getArchivePath(userId: string, month: string): string {
  return join(getUserDataDir(userId), "archive", `${month}.json`);
}

export function getBonusPath(userId: string, month: string): string {
  return join(getUserDataDir(userId), "bonuses", `${month}.json`);
}

async function ensureUserDirs(userId: string): Promise<void> {
  const userDataDir = getUserDataDir(userId);
  await fs.mkdir(userDataDir, { recursive: true });
  await fs.mkdir(join(userDataDir, "archive"), { recursive: true });
  await fs.mkdir(join(userDataDir, "bonuses"), { recursive: true });
}

const initializedUsers = new Set<string>();
export async function ensureUserDirsOnce(userId: string): Promise<void> {
  if (initializedUsers.has(userId)) return;
  await ensureUserDirs(userId);
  initializedUsers.add(userId);
}

export function migrateData(data: any): MonthlyData {
  return {
    ...data,
    schemaVersion: data.schemaVersion ?? 1,
    sales: data.sales?.map((s: any) => ({
      backGross: 0, stockNumber: "", year: "", make: "", model: "",
      ...s,
    })) ?? [],
  };
}

const isWorkDay = (date: Date): boolean => {
  const day = date.getDay();
  return day !== 0 && day !== 3;
};

const getPrevWorkDay = (date: Date): Date => {
  const prev = new Date(date);
  prev.setDate(prev.getDate() - 1);
  while (!isWorkDay(prev)) prev.setDate(prev.getDate() - 1);
  return prev;
};

export const calculateStreak = async (data: MonthlyData, userId: string, tz: string): Promise<number> => {
  const allDates = new Set<string>();
  const loadMonthData = (md: MonthlyData) => md.sales.forEach(s => allDates.add(s.date));
  loadMonthData(data);

  const [yearStr, monthStr] = data.month.split('-');
  let prevYear = parseInt(yearStr);
  let prevMonth = parseInt(monthStr) - 1;
  if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }
  const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  try {
    const prevDataRaw = await fs.readFile(getArchivePath(userId, prevMonthStr), "utf-8");
    loadMonthData(JSON.parse(prevDataRaw));
  } catch {}

  if (allDates.size === 0) return 0;

  const todayStr = formatDate(new Date(), tz);
  let currentDay = new Date();

  if (!allDates.has(todayStr)) {
    const yesterday = getPrevWorkDay(currentDay);
    const yesterdayStr = formatDate(yesterday, tz);
    if (!allDates.has(yesterdayStr)) return 0;
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
};

export async function atomicWrite(filePath: string, content: string): Promise<void> {
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, content);
  await fs.rename(tmpPath, filePath);
}

export async function archiveIfNeeded(userId: string, tz: string): Promise<void> {
  try {
    const currentPath = getCurrentDataPath(userId);
    const currentData = await fs.readFile(currentPath, "utf-8");
    const data: MonthlyData = JSON.parse(currentData);
    const currentMonth = getCurrentMonth(tz);

    if (data.month !== currentMonth) {
      const archivePath = getArchivePath(userId, data.month);
      let archiveExists = false;
      try { await fs.access(archivePath); archiveExists = true; } catch {}

      if (!archiveExists) {
        await atomicWrite(archivePath, currentData);
        console.log(`Archived ${data.month} for user ${userId}`);
      } else {
        console.log(`Archive for ${data.month} already exists, skipping overwrite`);
      }

      const newData: MonthlyData = {
        schemaVersion: 1, month: currentMonth, sales: [],
        lastActiveDate: formatDate(new Date(), tz), streak: 0, lastModifiedTime: Date.now(),
      };
      await atomicWrite(currentPath, JSON.stringify(newData, null, 2));
    }
  } catch (err) {
    console.error("archiveIfNeeded error:", err);
  }
}
