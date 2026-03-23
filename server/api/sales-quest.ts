import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { promises as fs } from "fs";
import { join } from "path";
import { z } from "zod";

const app = new Hono()

app.use('/*', cors({
  origin: process.env.FRONTEND_URL || '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Clerk-Token', 'X-Timezone'],
  credentials: true,
}))

const CLERK_JWKS_URL = "https://sunny-spider-24.clerk.accounts.dev/.well-known/jwks.json";
let cachedJwks: any = null;
let jwksTimestamp = 0;
let jwksFetchPromise: Promise<void> | null = null;

function base64UrlToUint8Array(base64Url: string): Uint8Array {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  return Buffer.from(base64 + padding, 'base64');
}

async function verifyClerkToken(token: string): Promise<string | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;
    const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
    if (!header.kid) return null;

    if (!cachedJwks || Date.now() - jwksTimestamp > 3600000) {
      if (!jwksFetchPromise) {
        jwksFetchPromise = (async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          try {
            const res = await fetch(CLERK_JWKS_URL, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) { cachedJwks = await res.json(); jwksTimestamp = Date.now(); }
            // on failure: leave cachedJwks as-is so stale keys still verify tokens
          } catch {
            clearTimeout(timeoutId);
          } finally {
            jwksFetchPromise = null;
          }
        })();
      }
      await jwksFetchPromise;
      if (!cachedJwks) return null; // nothing cached at all — hard fail
    }

    const jwk = cachedJwks.keys.find((k: any) => k.kid === header.kid);
    if (!jwk) return null;

    const key = await crypto.subtle.importKey(
      'jwk', jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false, ['verify']
    );

    const signature = base64UrlToUint8Array(signatureB64);
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const isValid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature as BufferSource, data);
    if (!isValid) return null;

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.sub || null;
  } catch (err) {
    console.error("Token verification error:", err);
    return null;
  }
}

async function authMiddleware(c: any): Promise<Response | void> {
  let authHeader = c.req.raw.headers.get("authorization")
    || c.req.raw.headers.get("Authorization")
    || c.req.header("Authorization");
  if (authHeader?.startsWith("Bearer ")) authHeader = authHeader.substring(7);
  if (!authHeader) return c.json({ success: false, error: "Auth: Missing token" }, 401);

  try {
    const userId = await verifyClerkToken(authHeader);
    if (!userId) return c.json({ success: false, error: "Auth: Invalid token" }, 401);
    c.set("userId", userId);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 401);
  }
}

const BASE_DATA_DIR = process.env.DATA_DIR || '/data/sales-quest';

const FALLBACK_TZ = 'America/Chicago';

function resolveTimezone(raw: string | null | undefined): string {
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

function getCurrentMonth(tz: string): string {
  const { year, month } = getUserDateParts(new Date(), tz);
  return `${year}-${month}`;
}

function formatDate(date: Date, tz: string): string {
  const { year, month, day } = getUserDateParts(date, tz);
  return `${year}-${month}-${day}`;
}

interface CommissionSnapshot {
  type: "flat" | "flat_plus_down" | "front_back_percent";
  flatAmount?: number;
  flatBase?: number;
  downPercent?: number;
  frontendPercent?: number;
  backendPercent?: number;
}

interface Sale {
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

interface Bonus {
  id: string;
  date: string;
  amount: number;
  label: string;
}

interface MonthlyData {
  schemaVersion?: number;
  month: string;
  sales: Sale[];
  lastActiveDate: string;
  streak?: number;
  lastModifiedTime?: number;
}

const MonthParamSchema = z.string().regex(/^\d{4}-\d{2}$/, "Invalid month format");

const CommissionSnapshotSchema = z.object({
  type: z.enum(["flat", "flat_plus_down", "front_back_percent"]),
  flatAmount: z.number().optional(),
  flatBase: z.number().optional(),
  downPercent: z.number().optional(),
  frontendPercent: z.number().optional(),
  backendPercent: z.number().optional(),
}).optional();

const SaleSchema = z.object({
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  customer: z.string().min(1).max(200),
  stockNumber: z.string().max(50).optional().default(""),
  year: z.string().max(10).optional().default(""),
  make: z.string().max(100).optional().default(""),
  model: z.string().max(100).optional().default(""),
  downPayment: z.number().min(0),
  frontGross: z.number().min(0).optional().default(0),
  backGross: z.number().min(0).optional().default(0),
  split: z.boolean(),
  notes: z.string().max(1000),
  commissionSnapshot: CommissionSnapshotSchema,
});

const BonusSchema = z.object({
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().min(0),
  label: z.string().min(1).max(200),
});

const SaveMonthlyDataSchema = z.object({
  sales: z.array(SaleSchema),
  lastModifiedTime: z.number().optional(),
});

function getUserDataDir(userId: string): string {
  return join(BASE_DATA_DIR, userId);
}

function getCurrentDataPath(userId: string): string {
  return join(getUserDataDir(userId), "current.json");
}

function getArchivePath(userId: string, month: string): string {
  return join(getUserDataDir(userId), "archive", `${month}.json`);
}

function getBonusPath(userId: string, month: string): string {
  return join(getUserDataDir(userId), "bonuses", `${month}.json`);
}

async function ensureUserDirs(userId: string): Promise<void> {
  const userDataDir = getUserDataDir(userId);
  await fs.mkdir(userDataDir, { recursive: true });
  await fs.mkdir(join(userDataDir, "archive"), { recursive: true });
  await fs.mkdir(join(userDataDir, "bonuses"), { recursive: true });
}

const initializedUsers = new Set<string>();
async function ensureUserDirsOnce(userId: string): Promise<void> {
  if (initializedUsers.has(userId)) return;
  await ensureUserDirs(userId);
  initializedUsers.add(userId);
}

function migrateData(data: any): MonthlyData {
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

const calculateStreak = async (data: MonthlyData, userId: string, tz: string): Promise<number> => {
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

async function atomicWrite(filePath: string, content: string): Promise<void> {
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, content);
  await fs.rename(tmpPath, filePath);
}

async function archiveIfNeeded(userId: string, tz: string): Promise<void> {
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

app.get('/', async (c) => {
  const authResult = await authMiddleware(c);
  if (authResult) return authResult;

  const userId = (c as any).get("userId") as string;
  if (!userId || typeof userId !== 'string') return c.json({ success: false, error: "Invalid user ID" }, 500);

  const tz = resolveTimezone(c.req.header('X-Timezone'));
  await ensureUserDirsOnce(userId);
  await archiveIfNeeded(userId, tz);

  const action = c.req.query("action");
  const rawMonth = c.req.query("month");
  const currentMonth = getCurrentMonth(tz);

  let requestedMonth: string | undefined;
  if (rawMonth) {
    const monthValidation = MonthParamSchema.safeParse(rawMonth);
    if (!monthValidation.success) return c.json({ success: false, error: "Invalid month format" }, 400);
    requestedMonth = monthValidation.data;
  }

  if (action === "get_settings") {
    try {
      const raw = await fs.readFile(join(getUserDataDir(userId), "settings.json"), "utf-8");
      return c.json({ success: true, settings: JSON.parse(raw) });
    } catch { return c.json({ success: true, settings: null }); }
  }

  if (action === "get_bonuses") {
    const bonusMonth = requestedMonth || currentMonth;
    try {
      const raw = await fs.readFile(getBonusPath(userId, bonusMonth), "utf-8");
      return c.json({ success: true, bonuses: JSON.parse(raw), month: bonusMonth });
    } catch { return c.json({ success: true, bonuses: [], month: bonusMonth }); }
  }

  if (action === "list_months") {
    const months: string[] = [currentMonth];
    try {
      const archiveDir = join(getUserDataDir(userId), "archive");
      const files = await fs.readdir(archiveDir);
      months.push(...files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')).sort().reverse());
    } catch {}
    return c.json({ success: true, months, currentMonth });
  }

  if (action === "all_time_total") {
    // Load settings for commission calculation
    let settings: any = {};
    try {
      settings = JSON.parse(await fs.readFile(join(getUserDataDir(userId), "settings.json"), "utf-8"));
    } catch {}

    const computeCommission = (sale: Sale, cfg: any): number => {
      const snap = sale.commissionSnapshot ?? cfg;
      let base = 0;
      if (snap.type === "flat") base = snap.flatAmount ?? 0;
      else if (snap.type === "flat_plus_down") base = (snap.flatBase ?? 0) + (sale.downPayment || 0) * ((snap.downPercent ?? 0) / 100);
      else if (snap.type === "front_back_percent") base = (sale.frontGross || 0) * ((snap.frontendPercent ?? 0) / 100) + (sale.backGross || 0) * ((snap.backendPercent ?? 0) / 100);
      return sale.split ? base / 2 : base;
    };

    let total = 0;

    // Current month
    try {
      const data: MonthlyData = JSON.parse(await fs.readFile(getCurrentDataPath(userId), "utf-8"));
      total += data.sales.reduce((sum, s) => sum + computeCommission(s, settings), 0);
    } catch {}

    // All archived months
    try {
      const archiveDir = join(getUserDataDir(userId), "archive");
      const files = (await fs.readdir(archiveDir)).filter(f => f.endsWith('.json'));
      await Promise.all(files.map(async (file) => {
        try {
          const data: MonthlyData = JSON.parse(await fs.readFile(join(archiveDir, file), "utf-8"));
          const monthTotal = data.sales.reduce((sum, s) => sum + computeCommission(s, settings), 0);
          total += monthTotal;
        } catch {}
      }));
    } catch {}

    return c.json({ success: true, total });
  }

  const isArchived = !!(requestedMonth && requestedMonth !== currentMonth);
  const dataPath = isArchived ? getArchivePath(userId, requestedMonth!) : getCurrentDataPath(userId);

  try {
    const data = await fs.readFile(dataPath, "utf-8");
    let monthData: MonthlyData = JSON.parse(data);
    monthData = migrateData(monthData);

    if (!isArchived) {
      monthData.streak = await calculateStreak(monthData, userId, tz);
    }

    return c.json({ success: true, data: monthData, isArchived, currentMonth });
  } catch (err) {
    if (isArchived) return c.json({ success: false, error: "Month not found", currentMonth }, 404);
    const emptyData: MonthlyData = {
      schemaVersion: 1, month: currentMonth, sales: [],
      lastActiveDate: formatDate(new Date(), tz), streak: 0, lastModifiedTime: Date.now(),
    };
    await atomicWrite(getCurrentDataPath(userId), JSON.stringify(emptyData, null, 2));
    return c.json({ success: true, data: emptyData, isArchived: false, currentMonth });
  }
});

app.post('/', async (c) => {
  const authResult = await authMiddleware(c);
  if (authResult) return authResult;

  const userId = (c as any).get("userId") as string;
  if (!userId || typeof userId !== 'string') return c.json({ success: false, error: "Invalid user ID" }, 500);

  const tz = resolveTimezone(c.req.header('X-Timezone'));
  await ensureUserDirsOnce(userId);

  const action = c.req.query("action");
  const currentMonth = getCurrentMonth(tz);

  if (action === "save_settings") {
    let body;
    try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON body" }, 400); }
    await atomicWrite(join(getUserDataDir(userId), "settings.json"), JSON.stringify(body, null, 2));
    return c.json({ success: true });
  }

  if (action === "save_bonus") {
    const rawMonth = c.req.query("month");
    let bonusMonth = currentMonth;

    if (rawMonth) {
      const monthValidation = MonthParamSchema.safeParse(rawMonth);
      if (!monthValidation.success) return c.json({ success: false, error: "Invalid month format" }, 400);
      if (monthValidation.data !== currentMonth) {
        return c.json({ success: false, error: "Cannot modify archived bonus months" }, 403);
      }
      bonusMonth = monthValidation.data;
    }

    let body;
    try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON body" }, 400); }
    const validation = BonusSchema.safeParse(body);
    if (!validation.success) return c.json({ success: false, error: "Invalid bonus data", details: validation.error.flatten() }, 400);

    let bonuses: Bonus[] = [];
    try { bonuses = JSON.parse(await fs.readFile(getBonusPath(userId, bonusMonth), "utf-8")); } catch {}
    bonuses.push(validation.data);
    await atomicWrite(getBonusPath(userId, bonusMonth), JSON.stringify(bonuses, null, 2));
    return c.json({ success: true, bonuses, month: bonusMonth });
  }

  if (action === "delete_bonus") {
    const rawMonth = c.req.query("month");
    let bonusMonth = currentMonth;

    if (rawMonth) {
      const monthValidation = MonthParamSchema.safeParse(rawMonth);
      if (!monthValidation.success) return c.json({ success: false, error: "Invalid month format" }, 400);
      if (monthValidation.data !== currentMonth) {
        return c.json({ success: false, error: "Cannot modify archived bonus months" }, 403);
      }
      bonusMonth = monthValidation.data;
    }

    let body: { id?: string };
    try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON body" }, 400); }
    if (!body.id) return c.json({ success: false, error: "Missing bonus id" }, 400);

    let bonuses: Bonus[] = [];
    try { bonuses = JSON.parse(await fs.readFile(getBonusPath(userId, bonusMonth), "utf-8")); } catch {}
    bonuses = bonuses.filter(b => b.id !== body.id);
    await atomicWrite(getBonusPath(userId, bonusMonth), JSON.stringify(bonuses, null, 2));
    return c.json({ success: true, bonuses, month: bonusMonth });
  }

  const rawMonth = c.req.query("month");

  if (rawMonth) {
    const monthValidation = MonthParamSchema.safeParse(rawMonth);
    if (!monthValidation.success) return c.json({ success: false, error: "Invalid month format" }, 400);
    if (monthValidation.data !== currentMonth) {
      return c.json({ success: false, error: "Cannot modify archived months" }, 403);
    }
  }

  let body;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON body" }, 400); }

  const validation = SaveMonthlyDataSchema.safeParse(body);
  if (!validation.success) {
    return c.json({ success: false, error: "Validation failed", details: validation.error.flatten() }, 400);
  }

  const currentPath = getCurrentDataPath(userId);
  let existingData: Partial<MonthlyData> = {};

  try {
    existingData = JSON.parse(await fs.readFile(currentPath, "utf-8"));
    const serverTime = existingData.lastModifiedTime || 0;
    const clientTime = validation.data.lastModifiedTime || 0;
    const CLOCK_SKEW_TOLERANCE = 60000;
    if (serverTime > 0 && clientTime > 0 && serverTime > clientTime + CLOCK_SKEW_TOLERANCE) {
      return c.json({ success: false, error: "Data is out of sync. Please refresh.", serverTime, clientTime }, 409);
    }
  } catch {}

  const data: MonthlyData = {
    schemaVersion: 1,
    month: currentMonth,
    sales: validation.data.sales,
    lastActiveDate: formatDate(new Date(), tz),
    lastModifiedTime: Date.now(),
  };

  data.streak = await calculateStreak(data, userId, tz);
  await atomicWrite(currentPath, JSON.stringify(data, null, 2));
  return c.json({ success: true, data, isArchived: false, currentMonth });
});

export default app;
