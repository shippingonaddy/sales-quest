import { z } from "zod";

export interface CommissionSnapshot {
  type: "flat" | "flat_plus_down" | "front_back_percent";
  flatAmount?: number;
  flatBase?: number;
  downPercent?: number;
  frontendPercent?: number;
  backendPercent?: number;
}

export interface Sale {
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

export interface Bonus {
  id: string;
  date: string;
  amount: number;
  label: string;
}

export interface MonthlyData {
  schemaVersion?: number;
  month: string;
  sales: Sale[];
  lastActiveDate: string;
  streak?: number;
  lastModifiedTime?: number;
}

export const MonthParamSchema = z.string().regex(/^\d{4}-\d{2}$/, "Invalid month format");

export const CommissionSnapshotSchema = z.object({
  type: z.enum(["flat", "flat_plus_down", "front_back_percent"]),
  flatAmount: z.number().optional(),
  flatBase: z.number().optional(),
  downPercent: z.number().optional(),
  frontendPercent: z.number().optional(),
  backendPercent: z.number().optional(),
}).optional();

export const SaleSchema = z.object({
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

export const BonusSchema = z.object({
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().min(0),
  label: z.string().min(1).max(200),
});

export const SaveMonthlyDataSchema = z.object({
  sales: z.array(SaleSchema),
  lastModifiedTime: z.number().optional(),
});
