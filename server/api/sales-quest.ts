import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Context } from 'hono'
import type { Sale, MonthlyData } from "../lib/types";
import { MonthParamSchema, BonusSchema, SaveMonthlyDataSchema } from "../lib/types";
import { authMiddleware, createSupabaseServerClient } from "../lib/auth";
import {
  resolveTimezone, getCurrentMonth, formatDate,
  getSettings, saveSettings,
  getMonthData, upsertMonthData, listMonths,
  getBonuses, saveBonus, deleteBonus,
  getAllMonthSales, calculateStreak,
} from "../lib/repository";

const app = new Hono()

app.use('/*', cors({
  origin: process.env.FRONTEND_URL || '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Timezone'],
  credentials: true,
}))

function extractToken(c: Context): string {
  const h = c.req.raw.headers.get("authorization") || c.req.header("Authorization") || "";
  return h.startsWith("Bearer ") ? h.substring(7) : h;
}

function getUserId(c: Context): string {
  return (c as unknown as { get: (k: string) => string }).get("userId");
}

// ─── GET ──────────────────────────────────────────────────────────────────────

app.get('/', async (c) => {
  const authResult = await authMiddleware(c);
  if (authResult) return authResult;

  const userId = getUserId(c);
  const client = createSupabaseServerClient(extractToken(c));
  const tz = resolveTimezone(c.req.header('X-Timezone'));
  const action = c.req.query("action");
  const rawMonth = c.req.query("month");
  const currentMonth = getCurrentMonth(tz);

  let requestedMonth: string | undefined;
  if (rawMonth) {
    const v = MonthParamSchema.safeParse(rawMonth);
    if (!v.success) return c.json({ success: false, error: "Invalid month format" }, 400);
    requestedMonth = v.data;
  }

  if (action === "get_settings") {
    const settings = await getSettings(client);
    return c.json({ success: true, settings });
  }

  if (action === "get_bonuses") {
    const bonusMonth = requestedMonth || currentMonth;
    const bonuses = await getBonuses(client, bonusMonth);
    return c.json({ success: true, bonuses, month: bonusMonth });
  }

  if (action === "list_months") {
    const months = await listMonths(client, currentMonth);
    return c.json({ success: true, months, currentMonth });
  }

  if (action === "all_time_total") {
    const settingsData = await getSettings(client) ?? {};

    const computeCommission = (sale: Sale, cfg: Record<string, unknown>): number => {
      let base = 0;
      if (cfg.type === "flat")
        base = (cfg.flatAmount as number) ?? 0;
      else if (cfg.type === "flat_plus_down")
        base = ((cfg.flatBase as number) ?? 0) + (sale.downPayment || 0) * (((cfg.downPercent as number) ?? 0) / 100);
      else if (cfg.type === "front_back_percent")
        base = (sale.frontGross || 0) * (((cfg.frontendPercent as number) ?? 0) / 100)
             + (sale.backGross  || 0) * (((cfg.backendPercent  as number) ?? 0) / 100);
      return sale.split ? base / 2 : base;
    };

    const allMonths = await getAllMonthSales(client);
    const total = allMonths.reduce(
      (sum, { sales }) => sum + sales.reduce((s, sale) => s + computeCommission(sale, settingsData), 0),
      0
    );
    return c.json({ success: true, total });
  }

  // Default: load month data
  const isArchived = !!(requestedMonth && requestedMonth !== currentMonth);
  const month = requestedMonth || currentMonth;
  const data = await getMonthData(client, month, tz);

  if (!data) {
    if (isArchived) return c.json({ success: false, error: "Month not found", currentMonth }, 404);
    const emptyData: MonthlyData = {
      schemaVersion: 1, month: currentMonth, sales: [],
      lastActiveDate: formatDate(new Date(), tz), streak: 0, lastModifiedTime: Date.now(),
    };
    await upsertMonthData(client, userId, emptyData);
    return c.json({ success: true, data: emptyData, isArchived: false, currentMonth });
  }

  if (!isArchived) data.streak = await calculateStreak(client, data, tz);
  return c.json({ success: true, data, isArchived, currentMonth });
});

// ─── POST ─────────────────────────────────────────────────────────────────────

app.post('/', async (c) => {
  const authResult = await authMiddleware(c);
  if (authResult) return authResult;

  const userId = getUserId(c);
  const client = createSupabaseServerClient(extractToken(c));
  const tz = resolveTimezone(c.req.header('X-Timezone'));
  const action = c.req.query("action");
  const currentMonth = getCurrentMonth(tz);

  if (action === "save_settings") {
    let body: unknown;
    try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON body" }, 400); }
    await saveSettings(client, userId, body);
    return c.json({ success: true });
  }

  if (action === "save_bonus" || action === "delete_bonus") {
    const rawMonth = c.req.query("month");
    let bonusMonth = currentMonth;
    if (rawMonth) {
      const v = MonthParamSchema.safeParse(rawMonth);
      if (!v.success) return c.json({ success: false, error: "Invalid month format" }, 400);
      if (v.data !== currentMonth) return c.json({ success: false, error: "Cannot modify archived bonus months" }, 403);
      bonusMonth = v.data;
    }

    let body: Record<string, unknown>;
    try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON body" }, 400); }

    if (action === "save_bonus") {
      const v = BonusSchema.safeParse(body);
      if (!v.success) return c.json({ success: false, error: "Invalid bonus data", details: v.error.flatten() }, 400);
      const bonuses = await saveBonus(client, userId, bonusMonth, v.data);
      return c.json({ success: true, bonuses, month: bonusMonth });
    }

    if (!body.id || typeof body.id !== "string") return c.json({ success: false, error: "Missing bonus id" }, 400);
    const bonuses = await deleteBonus(client, bonusMonth, body.id);
    return c.json({ success: true, bonuses, month: bonusMonth });
  }

  // Default: save monthly data
  const rawMonth = c.req.query("month");
  if (rawMonth) {
    const v = MonthParamSchema.safeParse(rawMonth);
    if (!v.success) return c.json({ success: false, error: "Invalid month format" }, 400);
    if (v.data !== currentMonth) return c.json({ success: false, error: "Cannot modify archived months" }, 403);
  }

  let body: unknown;
  try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON body" }, 400); }

  const validation = SaveMonthlyDataSchema.safeParse(body);
  if (!validation.success) return c.json({ success: false, error: "Validation failed", details: validation.error.flatten() }, 400);

  const existing = await getMonthData(client, currentMonth, tz);
  const serverTime = existing?.lastModifiedTime ?? 0;
  const clientTime = validation.data.lastModifiedTime ?? 0;
  if (serverTime > 0 && clientTime > 0 && serverTime > clientTime + 60000) {
    return c.json({ success: false, error: "Data is out of sync. Please refresh.", serverTime, clientTime }, 409);
  }

  const data: MonthlyData = {
    schemaVersion: 1, month: currentMonth,
    sales: validation.data.sales,
    lastActiveDate: formatDate(new Date(), tz),
    lastModifiedTime: Date.now(),
  };

  data.streak = await calculateStreak(client, data, tz);
  await upsertMonthData(client, userId, data);
  return c.json({ success: true, data, isArchived: false, currentMonth });
});

export default app;
