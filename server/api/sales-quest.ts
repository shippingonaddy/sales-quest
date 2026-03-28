import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { promises as fs } from "fs";
import { join } from "path";
import {
  Sale,
  Bonus,
  MonthlyData,
  MonthParamSchema,
  BonusSchema,
  SaveMonthlyDataSchema,
} from "../lib/types";
import { authMiddleware } from "../lib/auth";
import {
  resolveTimezone,
  getCurrentMonth,
  formatDate,
  getUserDataDir,
  getCurrentDataPath,
  getArchivePath,
  getBonusPath,
  ensureUserDirsOnce,
  migrateData,
  calculateStreak,
  atomicWrite,
  archiveIfNeeded,
} from "../lib/repository";

const app = new Hono()

app.use('/*', cors({
  origin: process.env.FRONTEND_URL || '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Clerk-Token', 'X-Timezone'],
  credentials: true,
}))



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
