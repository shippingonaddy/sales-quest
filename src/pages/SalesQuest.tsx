import { useCallback, useEffect, useRef, useState, type FC, type ReactNode, type TouchEvent } from "react";
import {
  Award, ChevronLeft, ChevronRight,
  Download, FileText, Flame, Pencil, Plus, Save,
  Settings, Star, TrendingUp, Upload, X, Zap,
} from "lucide-react";
import { useAuth, useUser, UserButton, RedirectToSignIn } from '@clerk/clerk-react';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface CommissionSnapshot {
  type: "flat" | "flat_plus_down" | "front_back_percent";
  flatAmount: number;
  flatBase: number;
  downPercent: number;
  frontendPercent: number;
  backendPercent: number;
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

interface GameState {
  sales: Sale[];
  lastActiveDate: string;
  streak?: number;
  lastModifiedTime?: number;
}

interface CommissionSettings {
  type: "flat" | "flat_plus_down" | "front_back_percent";
  flatAmount: number;
  flatBase: number;
  downPercent: number;
  frontendPercent: number;
  backendPercent: number;
  payPeriodType: "weekly" | "biweekly";
  payPeriodStart: string;
  configured: boolean;
}

type Screen = "home" | "badges" | "backup" | "settings" | "diagnostic";

// ─── Constants ────────────────────────────────────────────────────────────────

const XP_PER_LEVEL = 100;
const API_ENDPOINT = "/api/sales-quest";
const RETRY_DELAYS = [500, 1500, 3000];
const LOCAL_STORAGE_KEY = "sales_quest_local_data_v2";
const SETTINGS_KEY = "sales_quest_commission_settings_v2";
const BONUS_KEY = "sales_quest_bonuses_v1";

const DEFAULT_SETTINGS: CommissionSettings = {
  type: "flat_plus_down",
  flatAmount: 100,
  flatBase: 100,
  downPercent: 10,
  frontendPercent: 25,
  backendPercent: 0,
  payPeriodType: "biweekly",
  payPeriodStart: "",
  configured: false,
};

// Color tokens
const C = {
  cyan: "#00f2ff",
  purple: "#7f13ec",
  pink: "#ff00e5",
  amber: "#f59e0b",
  orange: "#f97316",
  violet: "#a78bfa",
  green: "#10b981",
  red: "#ef4444",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getLocalDateString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getCurrentMonth = (): string => getLocalDateString().slice(0, 7);

const getEmptyState = (): GameState => ({
  sales: [], lastActiveDate: getLocalDateString(),
  streak: 0, lastModifiedTime: Date.now(),
});

const loadSettings = (): CommissionSettings => {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    // Try old key for migration
    const oldStored = localStorage.getItem("sales_quest_commission_settings_v1");
    if (oldStored) {
      const old = JSON.parse(oldStored);
      // Migrate frontend_percent → front_back_percent
      if (old.type === "frontend_percent") old.type = "front_back_percent";
      delete old.volumeBonuses;
      return { ...DEFAULT_SETTINGS, ...old };
    }
  } catch (e) {}
  return { ...DEFAULT_SETTINGS };
};

const saveSettingsToStorage = (s: CommissionSettings) => {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
};

const loadBonusesFromStorage = (): Bonus[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(BONUS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return [];
};

const saveBonusesToStorage = (bonuses: Bonus[]) => {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(BONUS_KEY, JSON.stringify(bonuses)); } catch (e) {}
};

const getYesterday = (): string => {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

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

const calculateLocalStreakFromSales = (sales: Sale[], today = getLocalDateString()): number => {
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

const getLocalDateStringFromDate = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const buildLocalStateFromSales = (sales: Sale[]): GameState => {
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

const formatMonth = (month: string): string => {
  if (!month) return "";
  const [year, monthNum] = month.split("-");
  const date = new Date(parseInt(year, 10), parseInt(monthNum, 10) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

// ─── Commission Engine ────────────────────────────────────────────────────────

const computeBase = (sale: Sale, cfg: { type: string; flatAmount: number; flatBase: number; downPercent: number; frontendPercent: number; backendPercent: number }): number => {
  if (cfg.type === "flat") return cfg.flatAmount;
  if (cfg.type === "flat_plus_down") return cfg.flatBase + (sale.downPayment || 0) * (cfg.downPercent / 100);
  if (cfg.type === "front_back_percent") {
    return (sale.frontGross || 0) * (cfg.frontendPercent / 100) + (sale.backGross || 0) * ((cfg.backendPercent || 0) / 100);
  }
  return 0;
};

const getSaleCommission = (sale: Sale, settings: CommissionSettings): number => {
  const cfg = sale.commissionSnapshot
    ? { ...DEFAULT_SETTINGS, ...sale.commissionSnapshot }
    : settings;
  const base = computeBase(sale, cfg);
  return sale.split ? base / 2 : base;
};

const calculateRevenue = (sales: Sale[], settings: CommissionSettings): number =>
  sales.reduce((t, s) => t + getSaleCommission(s, settings), 0);

const createSnapshot = (s: CommissionSettings): CommissionSnapshot => ({
  type: s.type, flatAmount: s.flatAmount, flatBase: s.flatBase,
  downPercent: s.downPercent, frontendPercent: s.frontendPercent, backendPercent: s.backendPercent,
});

// ─── Pay Period ───────────────────────────────────────────────────────────────

const getPayPeriodRange = (settings: CommissionSettings): { start: string; end: string; label: string } => {
  if (!settings.payPeriodStart) {
    const now = new Date();
    const mStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const mEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const mEndStr = `${mEnd.getFullYear()}-${String(mEnd.getMonth() + 1).padStart(2, "0")}-${String(mEnd.getDate()).padStart(2, "0")}`;
    return { start: mStart, end: mEndStr, label: "This month" };
  }
  const periodDays = settings.payPeriodType === "weekly" ? 7 : 14;
  const today = new Date();
  let start = new Date(settings.payPeriodStart + "T00:00:00");
  for (let i = 0; i < 100; i++) {
    const end = new Date(start); end.setDate(end.getDate() + periodDays - 1);
    if (end >= today) {
      const toStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return { start: toStr(start), end: toStr(end), label: `${fmt(start)} – ${fmt(end)}` };
    }
    start.setDate(start.getDate() + periodDays);
  }
  return { start: settings.payPeriodStart, end: settings.payPeriodStart, label: "" };
};

// ─── XP / Level ──────────────────────────────────────────────────────────────

const calculateXP = (state: GameState): number => {
  let xp = state.sales.reduce((t, s) => t + (s.split ? 25 : 50), 0);
  xp += (state.streak || 0) * 25;
  return xp;
};

const getLevel = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1;
const getXPProgress = (xp: number) => xp % XP_PER_LEVEL;
const getXPRemaining = (xp: number) => XP_PER_LEVEL - (xp % XP_PER_LEVEL);

// ─── Badges ───────────────────────────────────────────────────────────────────

const badges = [
  { id: "first_deal", name: "First Deal", desc: "Close your first sale", color: C.cyan, icon: <Zap size={20} />, requirement: (s: GameState) => s.sales.length >= 1, xp: 50 },
  { id: "streak_3", name: "3-Day Run", desc: "Log a deal 3 days in a row", color: C.orange, icon: <Flame size={20} />, requirement: (s: GameState) => (s.streak || 0) >= 3, xp: 75 },
  { id: "streak_7", name: "7-Day Run", desc: "7-day sales streak", color: C.orange, icon: <Flame size={20} />, requirement: (s: GameState) => (s.streak || 0) >= 7, xp: 150 },
  { id: "deals_5", name: "High Five", desc: "Close 5 sales", color: C.violet, icon: <Star size={20} />, requirement: (s: GameState) => s.sales.length >= 5, xp: 100 },
  { id: "deals_10", name: "10-Deal Club", desc: "Close 10 sales", color: C.violet, icon: <Award size={20} />, requirement: (s: GameState) => s.sales.length >= 10, xp: 200 },
  { id: "deals_25", name: "25 Strong", desc: "Close 25 sales", color: C.pink, icon: <Award size={20} />, requirement: (s: GameState) => s.sales.length >= 25, xp: 500 },
  { id: "lvl_5", name: "Level 5", desc: "Reach Level 5", color: C.purple, icon: <Star size={20} />, requirement: (s: GameState) => getLevel(calculateXP(s)) >= 5, xp: 250 },
  { id: "lvl_10", name: "Level 10", desc: "Reach Level 10", color: C.amber, icon: <Award size={20} />, requirement: (s: GameState) => getLevel(calculateXP(s)) >= 10, xp: 1000 },
];

// ─── Date Grouping ────────────────────────────────────────────────────────────

const groupSalesByDate = (sales: Sale[]): { label: string; date: string; sales: Sale[] }[] => {
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

// ─── Glassmorphism Card Styles ────────────────────────────────────────────────

const glassCard = (hex: string, alpha = 0.07) => ({
  background: `rgba(${hexToRgb(hex)}, ${alpha})`,
  border: `1px solid rgba(${hexToRgb(hex)}, 0.45)`,
  boxShadow: `0 0 18px rgba(${hexToRgb(hex)}, 0.18), inset 0 1px 0 rgba(${hexToRgb(hex)}, 0.12)`,
  borderRadius: 14,
});

const hexToRgb = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
};

// ─── Background ──────────────────────────────────────────────────────────────

function Background() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const stars = Array.from({ length: 180 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.2, speed: Math.random() * 0.00006 + 0.00002, hue: Math.random() > 0.65 ? 270 : 210, phase: Math.random() * Math.PI * 2 }));
    const wisps = [{ x: 0.25, y: 0.20, r: 180, hue: 265, phase: 0.0 }, { x: 0.70, y: 0.50, r: 140, hue: 285, phase: 2.1 }, { x: 0.40, y: 0.80, r: 160, hue: 250, phase: 4.3 }];
    // Slow drifting grid nodes — replaces flower rings
    const nodes = Array.from({ length: 6 }, (_, i) => ({
      x: 0.15 + (i % 3) * 0.35,
      y: 0.2 + Math.floor(i / 3) * 0.55,
      vx: (Math.random() - 0.5) * 0.00015,
      vy: (Math.random() - 0.5) * 0.00015,
      hue: 260 + i * 12,
      phase: Math.random() * Math.PI * 2,
    }));
    let t = 0;
    const drawNodes = () => {
      // Draw faint lines between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const ax = nodes[i].x * canvas.width, ay = nodes[i].y * canvas.height;
          const bx = nodes[j].x * canvas.width, by = nodes[j].y * canvas.height;
          const dist = Math.hypot(ax - bx, ay - by);
          if (dist < 280) {
            const alpha = (1 - dist / 280) * 0.045;
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
            ctx.strokeStyle = `hsla(270, 70%, 65%, ${alpha})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }
      // Draw node dots
      nodes.forEach(n => {
        const x = n.x * canvas.width, y = n.y * canvas.height;
        const pulse = Math.sin(t * 0.003 + n.phase) * 0.3 + 0.7;
        ctx.beginPath(); ctx.arc(x, y, 1.5 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${n.hue}, 70%, 75%, ${0.12 * pulse})`; ctx.fill();
        // Drift
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0.05 || n.x > 0.95) n.vx *= -1;
        if (n.y < 0.05 || n.y > 0.95) n.vy *= -1;
      });
    };
    const draw = () => {
      ctx.fillStyle = "rgba(5, 2, 16, 0.20)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      wisps.forEach(w => { const gx = (w.x + Math.sin(t * 0.00025 + w.phase) * 0.07) * canvas.width, gy = (w.y + Math.cos(t * 0.00018 + w.phase) * 0.06) * canvas.height; const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, w.r); grad.addColorStop(0, `hsla(${w.hue}, 65%, 38%, 0.075)`); grad.addColorStop(0.5, `hsla(${w.hue}, 55%, 25%, 0.03)`); grad.addColorStop(1, "transparent"); ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height); });
      drawNodes();
      stars.forEach(s => { s.phase += s.speed * 55; const pulse = Math.sin(s.phase) * 0.35 + 0.65; const x = s.x * canvas.width, y = s.y * canvas.height; if (s.r > 0.9) { const halo = ctx.createRadialGradient(x, y, 0, x, y, s.r * 4); halo.addColorStop(0, `hsla(${s.hue}, 80%, 85%, ${0.12 * pulse})`); halo.addColorStop(1, "transparent"); ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(x, y, s.r * 4, 0, Math.PI * 2); ctx.fill(); } ctx.beginPath(); ctx.arc(x, y, s.r * pulse, 0, Math.PI * 2); ctx.fillStyle = `hsla(${s.hue}, 75%, 88%, ${0.75 * pulse})`; ctx.fill(); });
      t++; raf = requestAnimationFrame(draw);
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(draw);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgb(10, 6, 20)", zIndex: 0, pointerEvents: "none", display: "block" }} />;
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  screen: Screen;
  onNavigate: (s: Screen) => void;
  clerkUser: any;
  xp: number;
  level: number;
  isLocalMode: boolean;
}

const Drawer: FC<DrawerProps> = ({ open, onClose, screen, onNavigate, clerkUser, xp, level, isLocalMode }) => {
  const navItems: { id: Screen; label: string; color: string; icon: ReactNode }[] = [
    { id: "home", label: "Sales", color: C.cyan, icon: <TrendingUp size={14} /> },
    { id: "badges", label: "Badges", color: C.amber, icon: <Award size={14} /> },
    { id: "backup", label: "Backup", color: C.green, icon: <Download size={14} /> },
    { id: "settings", label: "Settings", color: C.violet, icon: <Settings size={14} /> },
    { id: "diagnostic", label: "Diagnostic", color: C.orange, icon: <Zap size={14} /> },
  ];
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />}
      <div className="fixed top-0 right-0 bottom-0 z-50 flex flex-col" style={{ width: 260, background: "rgba(10, 4, 22, 0.98)", borderLeft: `1px solid rgba(127,19,236,0.3)`, transform: open ? "translateX(0)" : "translateX(100%)", transition: "transform 0.25s ease" }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "rgba(127,19,236,0.15)" }}>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Menu</span>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ background: "rgba(127,19,236,0.15)", border: "1px solid rgba(127,19,236,0.3)" }}>
            <X size={14} className="text-violet-400" />
          </button>
        </div>
        {/* User */}
        <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: "rgba(127,19,236,0.1)" }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-violet-300" style={{ background: "rgba(127,19,236,0.25)", border: "1px solid rgba(127,19,236,0.5)" }}>
            {clerkUser?.firstName?.[0] || "A"}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">{clerkUser?.firstName || "Artie"}</p>
            <p className="text-xs text-violet-400/70 uppercase tracking-wide">Level {level} · {xp} XP</p>
          </div>
        </div>
        {/* Nav */}
        <nav className="flex-1 py-2">
          {navItems.map(item => {
            const active = screen === item.id;
            return (
              <button key={item.id} onClick={() => onNavigate(item.id)} className="w-full flex items-center gap-3 px-4 py-3 relative transition-colors" style={{ background: active ? `rgba(127,19,236,0.1)` : "transparent" }}>
                {active && <span className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r" style={{ background: C.purple }} />}
                <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `rgba(${hexToRgb(item.color)}, 0.12)`, border: `1px solid rgba(${hexToRgb(item.color)}, 0.28)`, color: item.color }}>
                  {item.icon}
                </span>
                <span className={`text-sm font-medium ${active ? "text-slate-100" : "text-slate-400"}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>
        {/* Footer */}
        <div className="p-4 border-t space-y-3" style={{ borderColor: "rgba(127,19,236,0.1)" }}>
          {!isLocalMode && (
            <div className="flex items-center gap-3">
              <UserButton afterSignOutUrl="/sales-quest" />
              <span className="text-xs text-slate-500">Account settings</span>
            </div>
          )}
          <p className="text-xs text-slate-600 uppercase tracking-widest">Sales Quest v2.0</p>
        </div>
      </div>
    </>
  );
};

// ─── Swipe Sale Card ──────────────────────────────────────────────────────────

interface SwipeSaleCardProps {
  sale: Sale;
  onEdit: () => void;
  onDelete: () => void;
  settings: CommissionSettings;
  isArchived: boolean;
}

const SwipeSaleCard: FC<SwipeSaleCardProps> = ({ sale, onEdit, onDelete, settings, isArchived }) => {
  const [swiped, setSwiped] = useState(false);
  const [clicked, setClicked] = useState(false);
  const startX = useRef(0);
  const commission = getSaleCommission(sale, settings);
  const dealType = sale.split ? "split" : "full";
  const stripColor = dealType === "split" ? C.violet : C.cyan;
  const pillColor = dealType === "split" ? C.violet : C.cyan;
  const amtColor = dealType === "split" ? C.violet : C.cyan;

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => { startX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (isArchived) return;
    const diff = startX.current - e.changedTouches[0].clientX;
    if (diff > 55) setSwiped(true);
    else if (diff < -25) setSwiped(false);
  };

  const handleClick = () => {
    if (isArchived) return;
    setClicked(prev => !prev);
  };

  const vehicle = [sale.year, sale.make, sale.model].filter(Boolean).join(" ");
  const showActions = !isArchived && (swiped || clicked);
  const slideOffset = showActions ? -96 : 0;

  return (
    <div className="relative overflow-hidden mb-2" style={{ borderRadius: 12 }}>
      {showActions && (
        <div className="absolute right-0 top-0 bottom-0 flex" style={{ width: 96 }}>
          <button onClick={() => { setSwiped(false); setClicked(false); onEdit(); }} className="flex flex-col items-center justify-center gap-1" style={{ width: 48, background: "rgba(167,139,250,0.2)", borderLeft: "1px solid rgba(167,139,250,0.3)" }}>
            <Pencil size={13} className="text-violet-400" />
            <span className="text-[8px] font-medium text-violet-400 uppercase tracking-wide">Edit</span>
          </button>
          <button onClick={onDelete} className="flex flex-col items-center justify-center gap-1" style={{ width: 48, background: "rgba(239,68,68,0.15)", borderLeft: "1px solid rgba(239,68,68,0.25)" }}>
            <X size={13} className="text-red-400" />
            <span className="text-[8px] font-medium text-red-400 uppercase tracking-wide">Del</span>
          </button>
        </div>
      )}
      <div
        className="flex items-center gap-3 pl-3 pr-3 py-3 relative cursor-pointer"
        style={{ background: "#111020", border: "1px solid rgba(127,19,236,0.12)", borderRadius: 12, transform: `translateX(${slideOffset}px)`, transition: "transform 0.2s ease", borderLeft: `2px solid ${stripColor}` }}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-100 truncate">{sale.customer}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[8px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wide" style={{ background: `rgba(${hexToRgb(pillColor)}, 0.1)`, color: pillColor }}>
              {dealType}
            </span>
            {vehicle && <span className="text-[9px] truncate" style={{ color: `rgba(${hexToRgb(stripColor)}, 0.5)` }}>{vehicle}</span>}
            {sale.stockNumber && !vehicle && <span className="text-[9px]" style={{ color: "rgba(100,116,139,0.5)" }}>#{sale.stockNumber}</span>}
          </div>
          {sale.notes && <p className="text-[9px] text-slate-500 italic truncate mt-1">{sale.notes}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-base font-bold" style={{ color: amtColor }}>${commission.toFixed(0)}</p>
          <p className="text-[8px] uppercase tracking-wide mt-0.5" style={{ color: "rgba(127,19,236,0.5)" }}>+{sale.split ? 25 : 50} XP</p>
        </div>
      </div>
    </div>
  );
};

// ─── Add Bonus Modal ──────────────────────────────────────────────────────────

interface AddBonusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bonus: Omit<Bonus, "id">) => void;
}

const AddBonusModal: FC<AddBonusModalProps> = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState({ date: getLocalDateString(), amount: 0, label: "" });
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm rounded-xl p-6 space-y-4" style={{ background: "rgba(25,16,34,0.95)", border: "1px solid rgba(245,158,11,0.3)" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Log Bonus</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1">Label</label>
          <input className="w-full h-11 px-4 rounded-lg text-slate-100 text-sm focus:outline-none" style={{ background: "rgba(10,6,18,0.5)", border: "1px solid rgba(127,19,236,0.3)" }} placeholder="Volume bonus, SPIF, etc." value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1">Amount ($)</label>
          <input type="number" className="w-full h-11 px-4 rounded-lg text-slate-100 text-sm focus:outline-none" style={{ background: "rgba(10,6,18,0.5)", border: "1px solid rgba(127,19,236,0.3)" }} placeholder="0" value={form.amount || ""} onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} />
        </div>
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1">Date</label>
          <input type="date" className="w-full h-11 px-4 rounded-lg text-slate-100 text-sm focus:outline-none" style={{ background: "rgba(10,6,18,0.5)", border: "1px solid rgba(127,19,236,0.3)" }} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
        </div>
        <button onClick={() => { if (!form.label || !form.amount) return; onSave(form); onClose(); }} className="w-full py-3 rounded-lg text-sm font-semibold text-amber-300 uppercase tracking-wide" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.4)" }}>
          Save Bonus
        </button>
      </div>
    </div>
  );
};

// ─── Sale Modal ───────────────────────────────────────────────────────────────

interface SaleModalProps {
  mode: "add" | "edit";
  sale: Sale | null;
  initialData: Omit<Sale, "id">;
  isOpen: boolean;
  onClose: () => void;
  onSave: (sale: Sale | Omit<Sale, "id">) => void;
  onDelete?: (id: string) => void;
  settings: CommissionSettings;
}

const SaleModal: FC<SaleModalProps> = ({ mode, sale, initialData, isOpen, onClose, onSave, onDelete, settings }) => {
  const [formData, setFormData] = useState<Omit<Sale, "id">>(initialData);

  useEffect(() => {
    if (mode === "edit" && sale) {
      setFormData({ date: sale.date, customer: sale.customer, stockNumber: sale.stockNumber || "", year: sale.year || "", make: sale.make || "", model: sale.model || "", downPayment: sale.downPayment, frontGross: sale.frontGross || 0, backGross: sale.backGross || 0, split: sale.split, notes: sale.notes });
    } else {
      setFormData(initialData);
    }
  }, [mode, sale, isOpen]);

  if (!isOpen) return null;

  const previewCommission = getSaleCommission({ ...formData, id: "" }, settings);

  const handleSave = () => {
    if (!formData.customer) return;
    if (mode === "edit" && sale) onSave({ ...sale, ...formData });
    else onSave({ ...formData });
  };

  const inp = "w-full h-12 px-4 rounded-lg text-slate-100 text-sm focus:outline-none transition-all placeholder-slate-500";
  const inpStyle = { background: "rgba(10,6,18,0.5)", border: "1px solid rgba(127,19,236,0.3)" };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50">
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-xl overflow-hidden" style={{ background: "rgba(22,12,38,0.97)", border: "1px solid rgba(127,19,236,0.25)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(127,19,236,0.2)" }}>
          <h3 className="text-lg font-bold text-white">{mode === "add" ? "Log a Sale" : "Edit Sale"}</h3>
          <button onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1.5">Date</label>
            <input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} className={inp} style={inpStyle} />
          </div>
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1.5">Customer name</label>
            <input type="text" placeholder="Customer name" value={formData.customer} onChange={e => setFormData(p => ({ ...p, customer: e.target.value }))} className={inp} style={inpStyle} />
          </div>

          {/* Vehicle info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1.5">Year</label>
              <input type="text" placeholder="2021" value={formData.year || ""} onChange={e => setFormData(p => ({ ...p, year: e.target.value }))} className={inp} style={inpStyle} />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1.5">Stock #</label>
              <input type="text" placeholder="A1234" value={formData.stockNumber || ""} onChange={e => setFormData(p => ({ ...p, stockNumber: e.target.value }))} className={inp} style={inpStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1.5">Make</label>
              <input type="text" placeholder="Toyota" value={formData.make || ""} onChange={e => setFormData(p => ({ ...p, make: e.target.value }))} className={inp} style={inpStyle} />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1.5">Model</label>
              <input type="text" placeholder="Camry" value={formData.model || ""} onChange={e => setFormData(p => ({ ...p, model: e.target.value }))} className={inp} style={inpStyle} />
            </div>
          </div>

          {/* Commission fields */}
          {settings.type === "flat_plus_down" && (
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1.5">Down payment ($)</label>
              <input type="number" placeholder="0.00" value={formData.downPayment || ""} onChange={e => setFormData(p => ({ ...p, downPayment: Number(e.target.value) }))} className={inp} style={inpStyle} />
            </div>
          )}
          {settings.type === "front_back_percent" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1.5">Front gross ($)</label>
                <input type="number" placeholder="0" value={formData.frontGross || ""} onChange={e => setFormData(p => ({ ...p, frontGross: Number(e.target.value) }))} className={inp} style={inpStyle} />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1.5">Back gross ($)</label>
                <input type="number" placeholder="0" value={formData.backGross || ""} onChange={e => setFormData(p => ({ ...p, backGross: Number(e.target.value) }))} className={inp} style={inpStyle} />
              </div>
            </div>
          )}

          {/* Split toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(127,19,236,0.06)", border: "1px solid rgba(127,19,236,0.15)" }}>
            <div>
              <p className="text-sm font-medium text-slate-100">Split sale</p>
              <p className="text-xs text-slate-500">Auto-halves commission</p>
            </div>
            <label className="cursor-pointer relative inline-flex items-center">
              <input type="checkbox" checked={formData.split} onChange={e => setFormData(p => ({ ...p, split: e.target.checked }))} className="sr-only peer" />
              <div className="w-10 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#7f13ec]" />
            </label>
          </div>

          {/* Commission preview */}
          <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: "rgba(0,242,255,0.05)", border: "1px solid rgba(0,242,255,0.2)" }}>
            <span className="text-xs text-slate-400 uppercase tracking-wide">Commission preview</span>
            <span className="text-xl font-bold" style={{ color: C.cyan }}>${previewCommission.toFixed(0)}</span>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1.5">Notes</label>
            <textarea placeholder="Deal notes..." value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} className="w-full px-4 py-3 rounded-lg text-slate-100 text-sm focus:outline-none resize-none placeholder-slate-500" style={inpStyle} rows={2} />
          </div>
        </div>

        <div className="px-5 pb-5 pt-3 border-t flex gap-3" style={{ borderColor: "rgba(127,19,236,0.2)" }}>
          {mode === "edit" && sale && onDelete && (
            <button onClick={() => onDelete(sale.id)} className="px-4 py-3 rounded-lg text-red-400 text-sm font-medium" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>Delete</button>
          )}
          <button onClick={handleSave} className="flex-1 py-3 rounded-lg text-sm font-bold text-purple-200 uppercase tracking-wide" style={{ background: "rgba(127,19,236,0.2)", border: "1px solid rgba(127,19,236,0.5)", boxShadow: "0 0 20px rgba(127,19,236,0.2)" }}>
            {mode === "add" ? `Log Sale +${formData.split ? 25 : 50} XP` : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Settings Screen ──────────────────────────────────────────────────────────

interface SettingsScreenProps {
  settings: CommissionSettings;
  onSave: (s: CommissionSettings) => void;
  onboarding?: boolean;
}

const SettingsScreen: FC<SettingsScreenProps> = ({ settings, onSave, onboarding }) => {
  const [local, setLocal] = useState<CommissionSettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave({ ...local, configured: true });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const row = "flex items-center justify-between p-4 mb-2 rounded-xl";
  const rowStyle = { background: "#111020", border: "1px solid rgba(127,19,236,0.12)" };
  const secLabel = "text-[9px] font-medium uppercase tracking-widest text-slate-500 mb-3 mt-5 first:mt-0";
  const inp = "h-11 px-4 rounded-lg text-slate-100 text-sm focus:outline-none w-full";
  const inpStyle = { background: "rgba(10,6,18,0.5)", border: "1px solid rgba(127,19,236,0.3)" };

  const structureTypes: { value: CommissionSettings["type"]; label: string; desc: string }[] = [
    { value: "flat", label: "Flat per deal", desc: "Fixed amount each sale" },
    { value: "flat_plus_down", label: "Flat + down %", desc: "Base + % of down payment" },
    { value: "front_back_percent", label: "Front + back %", desc: "% of front and back end gross" },
  ];

  return (
    <div className="space-y-1 pb-8">
      {onboarding && (
        <div className="mb-5 p-4 rounded-xl" style={{ background: "rgba(127,19,236,0.08)", border: "1px solid rgba(127,19,236,0.3)" }}>
          <p className="text-sm text-violet-300 font-medium">Set up your commission structure to start logging sales.</p>
        </div>
      )}

      <p className={secLabel}>Commission structure</p>
      {structureTypes.map(t => (
        <button key={t.value} onClick={() => setLocal(p => ({ ...p, type: t.value }))} className={`${row} w-full text-left`} style={{ ...rowStyle, borderColor: local.type === t.value ? "rgba(127,19,236,0.5)" : "rgba(127,19,236,0.12)", background: local.type === t.value ? "rgba(127,19,236,0.1)" : "#111020" }}>
          <div>
            <p className="text-sm text-slate-100 font-medium">{t.label}</p>
            <p className="text-xs text-slate-500">{t.desc}</p>
          </div>
          <div className="w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: local.type === t.value ? C.purple : "rgba(100,116,139,0.4)", background: local.type === t.value ? C.purple : "transparent" }} />
        </button>
      ))}

      {local.type === "flat" && (
        <>
          <p className={secLabel} style={{ marginTop: 20 }}>Flat amount</p>
          <input type="number" placeholder="100" value={local.flatAmount || ""} onChange={e => setLocal(p => ({ ...p, flatAmount: Number(e.target.value) }))} className={inp} style={inpStyle} />
        </>
      )}

      {local.type === "flat_plus_down" && (
        <>
          <p className={secLabel} style={{ marginTop: 20 }}>Flat base + down payment %</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] text-slate-500 uppercase tracking-wide block mb-1">Base ($)</label>
              <input type="number" placeholder="100" value={local.flatBase || ""} onChange={e => setLocal(p => ({ ...p, flatBase: Number(e.target.value) }))} className={inp} style={inpStyle} />
            </div>
            <div>
              <label className="text-[9px] text-slate-500 uppercase tracking-wide block mb-1">Down %</label>
              <input type="number" placeholder="10" value={local.downPercent || ""} onChange={e => setLocal(p => ({ ...p, downPercent: Number(e.target.value) }))} className={inp} style={inpStyle} />
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-2">Split deals halve the total. Split toggle halves automatically.</p>
        </>
      )}

      {local.type === "front_back_percent" && (
        <>
          <p className={secLabel} style={{ marginTop: 20 }}>Front end / back end %</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] text-slate-500 uppercase tracking-wide block mb-1">Front end %</label>
              <input type="number" placeholder="25" value={local.frontendPercent || ""} onChange={e => setLocal(p => ({ ...p, frontendPercent: Number(e.target.value) }))} className={inp} style={inpStyle} />
            </div>
            <div>
              <label className="text-[9px] text-slate-500 uppercase tracking-wide block mb-1">Back end %</label>
              <input type="number" placeholder="5" value={local.backendPercent || ""} onChange={e => setLocal(p => ({ ...p, backendPercent: Number(e.target.value) }))} className={inp} style={inpStyle} />
            </div>
          </div>
        </>
      )}

      <p className={secLabel} style={{ marginTop: 20 }}>Pay period</p>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {(["weekly", "biweekly"] as const).map(t => (
          <button key={t} onClick={() => setLocal(p => ({ ...p, payPeriodType: t }))} className="p-3 rounded-xl text-center" style={{ background: local.payPeriodType === t ? "rgba(127,19,236,0.1)" : "#111020", border: `1px solid ${local.payPeriodType === t ? "rgba(127,19,236,0.5)" : "rgba(127,19,236,0.12)"}` }}>
            <p className="text-sm font-medium text-slate-100 capitalize">{t === "biweekly" ? "Bi-weekly" : "Weekly"}</p>
          </button>
        ))}
      </div>
      <div>
        <label className="text-[9px] text-slate-500 uppercase tracking-wide block mb-1">Current period start</label>
        <input type="date" value={local.payPeriodStart || ""} onChange={e => setLocal(p => ({ ...p, payPeriodStart: e.target.value }))} className={inp} style={inpStyle} />
      </div>

      <p className={secLabel} style={{ marginTop: 20 }}>Preferences</p>
      <div className={row} style={rowStyle}>
        <div>
          <p className="text-sm text-slate-100">Split halving</p>
          <p className="text-xs text-slate-500">Auto-halve commission on split deals</p>
        </div>
        <div className="w-4 h-4 rounded flex items-center justify-center" style={{ background: "rgba(127,19,236,0.3)", border: "1px solid rgba(127,19,236,0.5)" }}>
          <span className="text-purple-300 text-[10px]">✓</span>
        </div>
      </div>

      <button onClick={handleSave} className="w-full mt-6 py-4 rounded-xl text-sm font-bold uppercase tracking-wide" style={{ background: "rgba(127,19,236,0.2)", border: "1px solid rgba(127,19,236,0.55)", boxShadow: "0 0 20px rgba(127,19,236,0.2)", color: "#c4b5fd" }}>
        <Save size={14} className="inline mr-2" />
        {saved ? "Saved!" : "Save Settings"}
      </button>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SalesQuest() {
  const { isLoaded: clerkLoaded, isSignedIn, getToken } = useAuth();
  const { user: clerkUser } = useUser();
  const isAuthenticated = isSignedIn ?? false;
  const [isLocalMode, _setIsLocalMode] = useState(false);
  const [state, setState] = useState<GameState>(getEmptyState());
  const [screen, setScreen] = useState<Screen>("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showAddSale, setShowAddSale] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [showAddBonus, setShowAddBonus] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error" | "loading" | "conflict">("loading");
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonth());
  const [isArchived, setIsArchived] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [commissionSettings, setCommissionSettings] = useState<CommissionSettings>(loadSettings);
  const [bonuses, setBonuses] = useState<Bonus[]>(loadBonusesFromStorage);
  const [totalCommissionAllMonths, setTotalCommissionAllMonths] = useState(0);
  const [newSale, setNewSale] = useState<Omit<Sale, "id">>({ date: getLocalDateString(), customer: "", stockNumber: "", year: "", make: "", model: "", downPayment: 0, frontGross: 0, backGross: 0, split: false, notes: "" });

  const makeId = () => { try { return crypto.randomUUID(); } catch { return `${Date.now()}_${Math.random().toString(16).slice(2)}`; } };

  // ─── Auth / Settings / Data helpers ────────────────────────────────────────

  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    if (isLocalMode) return { Accept: "application/json" };
    const headers: any = { Accept: "application/json" };
    if (isSignedIn) {
      try {
        const token = await getToken();
        if (token) { headers.Authorization = `Bearer ${token}`; headers["X-Clerk-Token"] = token; }
      } catch (err) { console.error("Failed to get Clerk token:", err); }
    }
    return headers;
  }, [isLocalMode, isSignedIn, getToken]);

  const handleSaveSettings = async (settings: CommissionSettings) => {
    const wasOnboarding = showOnboarding;
    setCommissionSettings(settings);
    saveSettingsToStorage(settings);
    setShowOnboarding(false);
    if (!isLocalMode && isSignedIn) {
      try {
        const headers = await getAuthHeaders();
        await fetch(`${API_ENDPOINT}?action=save_settings`, { method: "POST", headers: { ...(headers as any), "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      } catch (e) {}
    }
    // If user came from tapping Log a Sale, return them there
    if (wasOnboarding) {
      setScreen("home");
      setNewSale({ date: getLocalDateString(), customer: "", stockNumber: "", year: "", make: "", model: "", downPayment: 0, frontGross: 0, backGross: 0, split: false, notes: "" });
      setShowAddSale(true);
    }
  };

  const handleLogSaleClick = () => {
    if (!commissionSettings.configured) {
      setShowOnboarding(true);
      setScreen("settings");
      return;
    }
    setNewSale({ date: getLocalDateString(), customer: "", stockNumber: "", year: "", make: "", model: "", downPayment: 0, frontGross: 0, backGross: 0, split: false, notes: "" });
    setShowAddSale(true);
  };

  // ─── Bonus handlers ─────────────────────────────────────────────────────────

  const handleAddBonus = async (bonus: Omit<Bonus, "id">) => {
    const full: Bonus = { ...bonus, id: makeId() };
    const updated = [...bonuses, full];
    setBonuses(updated);
    saveBonusesToStorage(updated);
    if (!isLocalMode && isSignedIn) {
      try {
        const headers = await getAuthHeaders();
        await fetch(`${API_ENDPOINT}?action=save_bonus`, { method: "POST", headers: { ...(headers as any), "Content-Type": "application/json" }, body: JSON.stringify(full) });
      } catch (e) {}
    }
  };

  const handleDeleteBonus = async (id: string) => {
    const updated = bonuses.filter(b => b.id !== id);
    setBonuses(updated);
    saveBonusesToStorage(updated);
    if (!isLocalMode && isSignedIn) {
      try {
        const headers = await getAuthHeaders();
        await fetch(`${API_ENDPOINT}?action=delete_bonus`, { method: "POST", headers: { ...(headers as any), "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      } catch (e) {}
    }
  };

  // ─── Sale handlers ──────────────────────────────────────────────────────────

  const handleAddSale = (saleInput: Omit<Sale, "id">) => {
    const fullSale: Sale = { ...saleInput, id: makeId(), commissionSnapshot: createSnapshot(commissionSettings) };
    const nextSales = [...state.sales, fullSale];
    if (isLocalMode) {
      const ns = buildLocalStateFromSales(nextSales);
      setState(ns);
      try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ns)); } catch {}
    } else {
      saveToCloud(nextSales, state.lastModifiedTime);
    }
    setShowAddSale(false);
  };

  const handleUpdateSale = (updated: Sale | Omit<Sale, "id">) => {
    const fullSale = updated as Sale;
    const nextSales = state.sales.map(s => s.id === fullSale.id ? fullSale : s);
    if (isLocalMode) {
      const ns = buildLocalStateFromSales(nextSales);
      setState(ns);
      try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ns)); } catch {}
    } else {
      saveToCloud(nextSales, state.lastModifiedTime);
    }
    setEditingSale(null);
  };

  const deleteSale = (id: string) => {
    const nextSales = state.sales.filter(s => s.id !== id);
    if (isLocalMode) {
      const ns = buildLocalStateFromSales(nextSales);
      setState(ns);
      try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ns)); } catch {}
    } else {
      saveToCloud(nextSales, state.lastModifiedTime);
    }
    setEditingSale(prev => prev?.id === id ? null : prev);
  };

  // ─── Cloud settings load (once on login) ───────────────────────────────────

  useEffect(() => {
    if (isLocalMode || !isAuthenticated || !clerkLoaded || !clerkUser) return;
    const fetchSettings = async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_ENDPOINT}?action=get_settings`, { headers });
        const result = await res.json();
        if (result.success && result.settings) {
          const merged = { ...DEFAULT_SETTINGS, ...result.settings };
          if (merged.type === "frontend_percent") merged.type = "front_back_percent";
          setCommissionSettings(merged); saveSettingsToStorage(merged);
        }
      } catch {}
    };
    fetchSettings();
  }, [isAuthenticated, isLocalMode, clerkLoaded, clerkUser, getAuthHeaders]);

  // ─── Cloud bonuses load (reloads on month change) ───────────────────────────

  useEffect(() => {
    if (isLocalMode || !isAuthenticated || !clerkLoaded || !clerkUser || !selectedMonth) return;
    const fetchBonuses = async () => {
      try {
        const headers = await getAuthHeaders();
        const monthParam = selectedMonth !== currentMonth ? `&month=${selectedMonth}` : "";
        const res = await fetch(`${API_ENDPOINT}?action=get_bonuses${monthParam}`, { headers });
        const result = await res.json();
        if (result.success && result.bonuses) { setBonuses(result.bonuses); saveBonusesToStorage(result.bonuses); }
      } catch {}
    };
    fetchBonuses();
  }, [isAuthenticated, isLocalMode, clerkLoaded, clerkUser, selectedMonth, currentMonth, getAuthHeaders]);

  // ─── Month list ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isLocalMode || !isAuthenticated || !clerkLoaded || !clerkUser) return;
    const fetchMonths = async (retry = 0) => {
      try {
        setSaveStatus("loading");
        const headers = await getAuthHeaders();
        const res = await fetch(`${API_ENDPOINT}?action=list_months`, { headers });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) { setSaveStatus("error"); return; }
          if (retry < RETRY_DELAYS.length) { await new Promise(r => setTimeout(r, RETRY_DELAYS[retry])); return fetchMonths(retry + 1); }
          setSaveStatus("error"); return;
        }
        const result = await res.json();
        if (result.success) {
          setAvailableMonths(result.months || []);
          setCurrentMonth(result.currentMonth);
          setSelectedMonth(result.currentMonth);
          setSaveStatus("saved");
        } else {
          if (retry < RETRY_DELAYS.length) { await new Promise(r => setTimeout(r, RETRY_DELAYS[retry])); return fetchMonths(retry + 1); }
          setSaveStatus("error");
        }
      } catch {
        if (retry < RETRY_DELAYS.length) { await new Promise(r => setTimeout(r, RETRY_DELAYS[retry])); return fetchMonths(retry + 1); }
        setSaveStatus("error");
      }
    };
    fetchMonths();
  }, [isAuthenticated, isLocalMode, clerkLoaded, clerkUser, getAuthHeaders]);

  // ─── Data load ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isLocalMode) {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setState(buildLocalStateFromSales(parsed.sales || []));
        }
      } catch {}
      setSaveStatus("saved"); setAvailableMonths([]); const cm = getCurrentMonth(); setCurrentMonth(cm); setSelectedMonth(cm); return;
    }
    if (!selectedMonth || !isAuthenticated) return;
    const safetyTimeout = setTimeout(() => setSaveStatus(prev => prev === "loading" ? "error" : prev), 8000);
    const loadData = async (retry = 0) => {
      try {
        setSaveStatus("loading");
        const url = selectedMonth === currentMonth ? API_ENDPOINT : `${API_ENDPOINT}?month=${selectedMonth}`;
        const headers = await getAuthHeaders();
        const res = await fetch(url, { headers });
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) { setSaveStatus("error"); return; }
          if (retry < RETRY_DELAYS.length) { await new Promise(r => setTimeout(r, RETRY_DELAYS[retry])); return loadData(retry + 1); }
          setSaveStatus("error"); return;
        }
        const result = await res.json();
        if (result.success && result.data) { setState(result.data); setIsArchived(result.isArchived || false); setSaveStatus("saved"); }
        else {
          if (retry < RETRY_DELAYS.length) { await new Promise(r => setTimeout(r, RETRY_DELAYS[retry])); return loadData(retry + 1); }
          setSaveStatus("error");
        }
      } catch {
        if (retry < RETRY_DELAYS.length) { await new Promise(r => setTimeout(r, RETRY_DELAYS[retry])); return loadData(retry + 1); }
        setSaveStatus("error");
      }
    };
    loadData(); return () => clearTimeout(safetyTimeout);
  }, [selectedMonth, isAuthenticated, isLocalMode, getAuthHeaders, currentMonth]);

  // ─── Visibility refetch — sync when app comes back into focus ────────────────

  useEffect(() => {
    if (isLocalMode || !isAuthenticated || !currentMonth) return;
    const handleVisibility = async () => {
      if (document.visibilityState !== "visible") return;
      if (!isSignedIn) return;
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(API_ENDPOINT, { headers });
        const result = await res.json();
        if (result.success && result.data) {
          const serverTime = result.data.lastModifiedTime || 0;
          setState(prev => {
            if (serverTime > (prev.lastModifiedTime || 0)) { return result.data; }
            return prev;
          });
        }
      } catch {}
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isLocalMode, isAuthenticated, currentMonth, getAuthHeaders]);

  // ─── Save (explicit, only called on user mutations) ─────────────────────────

  const saveToCloud = useCallback(async (sales: Sale[], currentLastModifiedTime?: number) => {
    if (isLocalMode || isArchived) return;
    try {
      setSaveStatus("saving");
      const headers = await getAuthHeaders();
      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { ...(headers as any), "Content-Type": "application/json" },
        body: JSON.stringify({ sales, lastModifiedTime: currentLastModifiedTime }),
      });
      if (res.status === 409) { setSaveStatus("conflict"); alert("Data conflict. Please refresh."); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      if (result.success && result.data) {
        setState(result.data);
        setSaveStatus("saved");
        fetchTotalCommission();
      } else setSaveStatus("error");
    } catch { setSaveStatus("error"); }
  }, [isLocalMode, isArchived, getAuthHeaders]);

  // ─── Total commission ───────────────────────────────────────────────────────

  const fetchTotalCommission = useCallback(async (): Promise<void> => {
    if (!isSignedIn) return;
    const allBonusesTotal = bonuses.reduce((sum, b) => sum + b.amount, 0);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_ENDPOINT}?action=all_time_total`, { headers });
      const result = await res.json();
      if (result.success) setTotalCommissionAllMonths(result.total + allBonusesTotal);
    } catch {}
  }, [bonuses, getAuthHeaders, isSignedIn]);

  useEffect(() => {
    if (!isAuthenticated || !clerkLoaded || !clerkUser) return;
    fetchTotalCommission();
  }, [isAuthenticated, clerkLoaded, clerkUser, fetchTotalCommission]);

  // ─── Diagnostic ─────────────────────────────────────────────────────────────

  const runDiagnostic = async () => {
    if (isLocalMode) { setDiagnosticResult({ localMode: true, salesCount: state.sales.length, lastModified: state.lastModifiedTime, timestamp: new Date().toISOString() }); return; }
    setDiagnosticResult({ loading: true });
    try {
      const token = await getToken();
      if (!token) { setDiagnosticResult({ summary: "Clerk returned null token", timestamp: new Date().toISOString() }); return; }
      const headers: any = { Authorization: `Bearer ${token}`, "X-Clerk-Token": token };
      const res = await fetch(`${API_ENDPOINT}?action=list_months`, { headers });
      const result = await res.json();
      setDiagnosticResult({ summary: res.ok ? "✅ JWT VALID - API accepted token" : `❌ ${result.error || "API rejected"}`, status: res.status, apiResponse: result, tokenPrefix: token.substring(0, 30) + "...", storageUsed: JSON.stringify(localStorage).length, timestamp: new Date().toISOString() });
    } catch (e) { setDiagnosticResult({ error: String(e), timestamp: new Date().toISOString() }); }
  };

  // ─── Export / Import ────────────────────────────────────────────────────────

  const exportData = async () => {
    try {
      if (isLocalMode) {
        const payload = { exportedAt: new Date().toISOString(), months: { [getCurrentMonth()]: state }, bonuses };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `sales-quest-backup-${getLocalDateString()}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); return;
      }
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_ENDPOINT}?action=list_months`, { headers });
      const { months } = await res.json();
      const allData: Record<string, any> = {};
      for (const month of months || []) { const mr = await fetch(`${API_ENDPOINT}?month=${month}`, { headers }); const { data } = await mr.json(); allData[month] = data; }
      const payload = { exportedAt: new Date().toISOString(), months: allData, bonuses };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `sales-quest-backup-${getLocalDateString()}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { alert("Failed to export data."); }
  };

  const importData = async (file: File) => {
    try {
      const imported = JSON.parse(await file.text());
      let monthsData: Record<string, any>;
      if (imported.months) { monthsData = imported.months; }
      else if (imported.data?.month) {
        const ld = imported.data;
        const salesByMonth: Record<string, any[]> = {};
        (ld.sales || []).forEach((s: any) => { const m = s.date?.slice(0, 7) || getCurrentMonth(); if (!salesByMonth[m]) salesByMonth[m] = []; salesByMonth[m].push(s); });
        monthsData = {};
        for (const [m, sales] of Object.entries(salesByMonth)) monthsData[m] = { sales, lastActiveDate: ld.lastActiveDate || getLocalDateString(), streak: ld.streak || 0 };
      } else monthsData = { [getCurrentMonth()]: imported };

      if (imported.bonuses) { setBonuses(imported.bonuses); saveBonusesToStorage(imported.bonuses); }

      const current = getCurrentMonth();
      if (isLocalMode) {
        const d = monthsData[current] as any;
        if (d?.sales) { const ns = buildLocalStateFromSales(d.sales); setState(ns); try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ns)); } catch {} alert(`Imported ${d.sales.length} sales into the current month.`); } return;
      }
      const headers = await getAuthHeaders();
      const currentMonthData = monthsData[current] as any;
      if (!currentMonthData?.sales) {
        alert("This backup does not include sales for the current month.");
        return;
      }

      const ns = buildLocalStateFromSales(currentMonthData.sales);
      const r = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { ...(headers as any), "Content-Type": "application/json" },
        body: JSON.stringify({ sales: ns.sales, lastModifiedTime: state.lastModifiedTime }),
      });
      const result = await r.json();
      if (!result.success) {
        throw new Error(result.error || "Import failed");
      }

      setState(() => ({
        ...ns,
        streak: result.data?.streak ?? ns.streak,
        lastModifiedTime: result.data?.lastModifiedTime ?? Date.now(),
      }));

      const skippedMonths = Object.keys(monthsData).filter(month => month !== current && (monthsData[month] as any)?.sales);
      const skippedNote = skippedMonths.length > 0
        ? ` Skipped ${skippedMonths.length} archived month${skippedMonths.length === 1 ? "" : "s"} because the current API only accepts current-month imports.`
        : "";
      alert(`Imported ${currentMonthData.sales.length} sales into ${formatMonth(current)}.${skippedNote}`);
    } catch { alert("Failed to import file. Check the format."); }
  };

  // ─── Early returns ──────────────────────────────────────────────────────────

  if (!clerkLoaded && !isLocalMode) {
    return (
      <div className="min-h-screen flex items-center justify-center relative" style={{ background: "#0a0614" }}>
        <Background />
        <div className="text-center relative z-10"><h1 className="text-4xl font-bold text-white mb-3">Sales Quest</h1><p className="text-slate-400">Loading authentication...</p></div>
      </div>
    );
  }
  if (!isAuthenticated && !isLocalMode) {
    return (
      <div className="min-h-screen flex items-center justify-center relative" style={{ background: "#0a0614" }}>
        <Background />
        <div className="text-center relative z-10"><h1 className="text-4xl font-bold text-white mb-3">Sales Quest</h1><p className="text-slate-400">Redirecting to sign in...</p></div>
        <RedirectToSignIn redirectUrl={window.location.href} />
      </div>
    );
  }

  // ─── Computed values ────────────────────────────────────────────────────────

  const xp = calculateXP(state);
  const level = getLevel(xp);
  const xpProgress = getXPProgress(xp);
  const xpRemaining = getXPRemaining(xp);
  const revenue = calculateRevenue(state.sales, commissionSettings);
  const payPeriod = getPayPeriodRange(commissionSettings);
  const payPeriodRevenue = calculateRevenue(state.sales.filter(s => s.date >= payPeriod.start && s.date <= payPeriod.end), commissionSettings);
  const monthBonuses = bonuses.filter(b => b.date.startsWith(selectedMonth || currentMonth));
  const monthBonusTotal = monthBonuses.reduce((t, b) => t + b.amount, 0);
  const dateGroups = groupSalesByDate(state.sales);
  const unlockedBadges = badges.filter(b => b.requirement(state));
  const nextBadge = badges.find(b => !b.requirement(state));

  // ─── Render ─────────────────────────────────────────────────────────────────

  const glassStyle = (color: string) => glassCard(color);

  return (
    <div className="min-h-screen relative overflow-x-hidden" style={{ background: "#0a0614" }}>
      <Background />

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} screen={screen} onNavigate={s => { setScreen(s); setDrawerOpen(false); if (s === "diagnostic") runDiagnostic(); }} clerkUser={clerkUser} xp={xp} level={level} isLocalMode={isLocalMode} />

      <div className="relative z-10 min-h-screen flex flex-col max-w-md mx-auto px-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between pt-12 pb-3">
          <div>
            <h1 className="text-base font-bold text-slate-100 uppercase tracking-widest">Sales Quest</h1>
            <p className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: "rgba(127,19,236,0.85)" }}>Galactic Sector 7-G</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-[9px] uppercase tracking-widest font-medium ${saveStatus === "saved" ? "text-emerald-500" : saveStatus === "saving" ? "text-violet-400" : saveStatus === "conflict" ? "text-red-400" : "text-amber-400"}`}>
              {saveStatus === "saved" ? "Synced" : saveStatus === "saving" ? "Saving…" : saveStatus === "loading" ? "Loading…" : saveStatus === "conflict" ? "Conflict" : "Error"}
            </span>
            <button onClick={() => setDrawerOpen(true)} className="flex flex-col gap-1 p-2">
              <span className="block h-px rounded bg-violet-400/70" style={{ width: 18 }} />
              <span className="block h-px rounded bg-violet-400/70" style={{ width: 13 }} />
              <span className="block h-px rounded bg-violet-400/70" style={{ width: 18 }} />
            </button>
          </div>
        </div>

        {/* ── HOME SCREEN ── */}
        {screen === "home" && (
          <div className="flex-1 pb-8">

            {/* Month selector */}
            {availableMonths.length > 1 && (
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => { const i = availableMonths.indexOf(selectedMonth); if (i < availableMonths.length - 1) setSelectedMonth(availableMonths[i + 1]); }} disabled={availableMonths.indexOf(selectedMonth) >= availableMonths.length - 1} className="p-1 text-slate-400 disabled:opacity-30"><ChevronLeft size={16} /></button>
                <span className="text-xs font-medium text-slate-400">{formatMonth(selectedMonth)}{isArchived && " (archived)"}</span>
                <button onClick={() => { const i = availableMonths.indexOf(selectedMonth); if (i > 0) setSelectedMonth(availableMonths[i - 1]); }} disabled={availableMonths.indexOf(selectedMonth) <= 0} className="p-1 text-slate-400 disabled:opacity-30"><ChevronRight size={16} /></button>
              </div>
            )}

            {/* ─ Earnings section ─ */}
            <p className="text-[9px] font-medium uppercase tracking-widest text-slate-500 mb-2">Earnings</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {/* Hero: this month + pay period */}
              <div className="col-span-2 flex items-center justify-between p-4" style={{ ...glassStyle(C.cyan), minHeight: 82 }}>
                <div>
                  <p className="text-[9px] font-medium uppercase tracking-widest mb-1" style={{ color: `rgba(${hexToRgb(C.cyan)}, 0.65)` }}>This month</p>
                  <p className="text-2xl font-bold text-slate-50">${(revenue + monthBonusTotal).toFixed(0)}</p>
                  <span className="text-[8px] uppercase tracking-wide px-1.5 py-0.5 rounded-full mt-1 inline-block" style={{ background: `rgba(${hexToRgb(C.cyan)}, 0.12)`, color: C.cyan }}>Commission</span>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-medium uppercase tracking-widest mb-1" style={{ color: `rgba(${hexToRgb(C.cyan)}, 0.6)` }}>Pay period</p>
                  <p className="text-lg font-bold text-slate-50">${payPeriodRevenue.toFixed(0)}</p>
                  <span className="text-[8px] uppercase tracking-wide px-1.5 py-0.5 rounded-full mt-1 inline-block" style={{ background: `rgba(${hexToRgb(C.violet)}, 0.15)`, color: C.violet }}>{payPeriod.label}</span>
                </div>
              </div>

              {/* All-time */}
              <div className="p-3 flex flex-col justify-between" style={{ ...glassStyle(C.pink), minHeight: 80 }}>
                <p className="text-[9px] font-medium uppercase tracking-widest" style={{ color: `rgba(${hexToRgb(C.pink)}, 0.65)` }}>All-time</p>
                <div>
                  <p className="text-lg font-bold text-slate-50">${totalCommissionAllMonths.toFixed(0)}</p>
                  <span className="text-[8px] uppercase tracking-wide px-1.5 py-0.5 rounded-full mt-1 inline-block" style={{ background: `rgba(${hexToRgb(C.pink)}, 0.12)`, color: C.pink }}>All months</span>
                </div>
              </div>

              {/* Bonuses */}
              <div className="p-3 flex flex-col justify-between" style={{ ...glassStyle(C.amber), minHeight: 80 }}>
                <p className="text-[9px] font-medium uppercase tracking-widest" style={{ color: `rgba(${hexToRgb(C.amber)}, 0.65)` }}>Bonuses</p>
                <div>
                  <p className="text-lg font-bold text-slate-50">${monthBonusTotal.toFixed(0)}</p>
                  <span className="text-[8px] uppercase tracking-wide px-1.5 py-0.5 rounded-full mt-1 inline-block" style={{ background: `rgba(${hexToRgb(C.amber)}, 0.12)`, color: C.amber }}>This month</span>
                </div>
              </div>
            </div>

            {/* ─ Performance section ─ */}
            <p className="text-[9px] font-medium uppercase tracking-widest text-slate-500 mb-2 mt-4">Performance</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="p-3 flex flex-col justify-between" style={{ ...glassStyle(C.violet), minHeight: 80 }}>
                <p className="text-[9px] font-medium uppercase tracking-widest" style={{ color: `rgba(${hexToRgb(C.violet)}, 0.65)` }}>Total sales</p>
                <div>
                  <p className="text-2xl font-bold text-slate-50">{state.sales.length}</p>
                  <p className="text-[9px] uppercase tracking-wide mt-1" style={{ color: `rgba(${hexToRgb(C.violet)}, 0.5)` }}>Units this month</p>
                </div>
              </div>
              <div className="p-3 flex flex-col justify-between" style={{ ...glassStyle(C.orange), minHeight: 80 }}>
                <p className="text-[9px] font-medium uppercase tracking-widest" style={{ color: `rgba(${hexToRgb(C.orange)}, 0.65)` }}>Streak</p>
                <div>
                  <p className="text-2xl font-bold text-slate-50">{state.streak || 0}</p>
                  <p className="text-[9px] uppercase tracking-wide mt-1" style={{ color: `rgba(${hexToRgb(C.orange)}, 0.5)` }}>Days active</p>
                </div>
              </div>

              {/* XP bar */}
              <div className="col-span-2 p-3" style={{ ...glassStyle(C.purple), minHeight: 60, justifyContent: "center", display: "flex", flexDirection: "column" }}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <p className="text-[9px] font-medium uppercase tracking-widest" style={{ color: `rgba(${hexToRgb(C.violet)}, 0.65)` }}>
                    <span className="text-slate-100 font-bold text-xs">Level {level}</span> Voyager — {xp} XP
                  </p>
                  <span className="text-[8px]" style={{ color: `rgba(${hexToRgb(C.violet)}, 0.4)` }}>{xpRemaining} to lvl {level + 1}</span>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: `rgba(${hexToRgb(C.purple)}, 0.15)` }}>
                  <div className="h-full rounded-full" style={{ width: `${(xpProgress / XP_PER_LEVEL) * 100}%`, background: C.purple }} />
                </div>
              </div>
            </div>

            {/* ─ Log a Sale button on home ─ */}
            {!isArchived && (
              <button onClick={handleLogSaleClick} className="w-full flex items-center gap-3 mb-6 mt-4 py-4 px-5 rounded-xl" style={{ background: "rgba(127,19,236,0.15)", border: "1px solid rgba(127,19,236,0.55)", boxShadow: "0 0 24px rgba(127,19,236,0.22), inset 0 1px 0 rgba(167,139,250,0.18)" }}>
                <span className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(127,19,236,0.2)", border: "1px solid rgba(127,19,236,0.4)" }}>
                  <Plus size={14} style={{ color: C.violet }} />
                </span>
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#c4b5fd" }}>Log a sale</span>
                <span className="ml-auto text-[8px] font-medium uppercase tracking-wide px-2 py-1 rounded-full" style={{ background: "rgba(127,19,236,0.12)", border: "1px solid rgba(127,19,236,0.25)", color: `rgba(167,139,250,0.7)` }}>+50 XP</span>
              </button>
            )}

            {/* ─ Sales list ─ */}
            {/* Month summary bar */}
            <div className="flex items-center justify-between mb-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(127,19,236,0.07)", border: "1px solid rgba(127,19,236,0.22)" }}>
              <div>
                <p className="text-xs font-bold text-slate-100 uppercase tracking-wide">{formatMonth(selectedMonth || currentMonth)}</p>
                <p className="text-[9px] uppercase tracking-wide mt-0.5" style={{ color: "rgba(167,139,250,0.55)" }}>{state.sales.length} sales</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold" style={{ color: C.cyan }}>${revenue.toFixed(0)}</p>
                <p className="text-[9px] uppercase tracking-wide" style={{ color: `rgba(${hexToRgb(C.cyan)}, 0.45)` }}>Commission</p>
              </div>
            </div>

            {/* Empty state */}
            {state.sales.length === 0 && (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: "rgba(127,19,236,0.08)", border: "1px solid rgba(127,19,236,0.2)" }}>
                  <TrendingUp size={20} className="text-violet-500/50" />
                </div>
                <p className="text-sm font-semibold text-slate-300 mb-1">No sales yet</p>
                <p className="text-xs text-slate-500">Log your first deal to start earning XP</p>
              </div>
            )}

            {/* Date-grouped sale cards */}
            {dateGroups.map(group => (
              <div key={group.date} className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-medium uppercase tracking-widest text-slate-500 whitespace-nowrap">{group.label}</span>
                  <div className="flex-1 h-px" style={{ background: "rgba(127,19,236,0.12)" }} />
                </div>
                {group.sales.map(sale => (
                  <SwipeSaleCard key={sale.id} sale={sale} onEdit={() => setEditingSale(sale)} onDelete={() => deleteSale(sale.id)} settings={commissionSettings} isArchived={isArchived} />
                ))}
              </div>
            ))}

            {/* Bonus log entries */}
            {monthBonuses.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-medium uppercase tracking-widest text-slate-500">Bonuses</span>
                  <div className="flex-1 h-px" style={{ background: "rgba(127,19,236,0.12)" }} />
                </div>
                {monthBonuses.map(bonus => (
                  <div key={bonus.id} className="flex items-center gap-3 pl-3 pr-3 py-3 mb-2 relative" style={{ background: "#111020", border: "1px solid rgba(127,19,236,0.12)", borderRadius: 12, borderLeft: `2px solid ${C.amber}` }}>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-100">{bonus.label}</p>
                      <p className="text-[9px] uppercase tracking-wide mt-0.5" style={{ color: `rgba(${hexToRgb(C.amber)}, 0.45)` }}>{bonus.date}</p>
                    </div>
                    <p className="text-base font-bold" style={{ color: C.amber }}>${bonus.amount.toFixed(0)}</p>
                    {!isArchived && (
                      <button onClick={() => handleDeleteBonus(bonus.id)} className="ml-1"><X size={12} className="text-slate-600 hover:text-red-400 transition-colors" /></button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!isArchived && (
              <button onClick={() => setShowAddBonus(true)} className="w-full py-2.5 rounded-xl text-xs font-medium uppercase tracking-wide text-amber-400/70 mt-1" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
                + Log bonus
              </button>
            )}

            {!isArchived && state.sales.length > 0 && (
              <p className="text-center text-[8px] text-slate-600 mt-4 uppercase tracking-widest">Swipe a card left to edit or delete</p>
            )}
          </div>
        )}

        {/* ── BADGES SCREEN ── */}
        {screen === "badges" && (
          <div className="flex-1 pb-8">
            {nextBadge && (
              <div className="p-4 rounded-xl mb-5 mt-2" style={{ background: "rgba(127,19,236,0.07)", border: "1px solid rgba(127,19,236,0.2)" }}>
                <p className="text-[9px] uppercase tracking-widest text-violet-400/60 mb-1">Next badge</p>
                <p className="text-sm font-bold text-slate-100 mb-1">{nextBadge.name}</p>
                <p className="text-xs text-slate-500">{nextBadge.desc}</p>
              </div>
            )}

            <p className="text-[9px] font-medium uppercase tracking-widest text-slate-500 mb-3 mt-2">Earned — {unlockedBadges.length} / {badges.length}</p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {badges.filter(b => b.requirement(state)).map(badge => (
                <div key={badge.id} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `rgba(${hexToRgb(badge.color)}, 0.1)`, border: `1px solid rgba(${hexToRgb(badge.color)}, 0.4)`, boxShadow: `0 0 14px rgba(${hexToRgb(badge.color)}, 0.15)`, color: badge.color }}>
                    {badge.icon}
                  </div>
                  <p className="text-[8px] font-medium text-slate-200 text-center uppercase tracking-wide">{badge.name}</p>
                </div>
              ))}
            </div>

            {badges.filter(b => !b.requirement(state)).length > 0 && (
              <>
                <p className="text-[9px] font-medium uppercase tracking-widest text-slate-500 mb-3">Locked</p>
                <div className="grid grid-cols-3 gap-3">
                  {badges.filter(b => !b.requirement(state)).map(badge => (
                    <div key={badge.id} className="flex flex-col items-center gap-2 opacity-40">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(127,19,236,0.05)", border: "1px solid rgba(127,19,236,0.12)" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="#94a3b8" strokeWidth="1.5"/><path d="M8 11V7a4 4 0 018 0v4" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </div>
                      <p className="text-[8px] font-medium text-slate-500 text-center uppercase tracking-wide">{badge.name}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── BACKUP SCREEN ── */}
        {screen === "backup" && (
          <div className="flex-1 pb-8 space-y-3 mt-2">
            <div className="p-4 rounded-xl" style={{ background: "#111020", border: "1px solid rgba(127,19,236,0.15)" }}>
              <p className="text-sm font-bold text-slate-100 mb-1">Export data</p>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">Download all sales, bonuses, and settings as a JSON file.</p>
              <button onClick={exportData} className="w-full flex items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.35)", color: C.green }}>
                <Download size={14} /> Export as JSON
              </button>
              <p className="text-[9px] text-slate-600 mt-3">{state.sales.length} sales ready · bonuses included</p>
            </div>

            <div className="p-4 rounded-xl" style={{ background: "#111020", border: "1px solid rgba(127,19,236,0.15)" }}>
              <p className="text-sm font-bold text-slate-100 mb-1">Import data</p>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">Restore from a previously exported file. Replaces the imported month data in this app.</p>
              <label className="w-full flex items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium cursor-pointer" style={{ background: "rgba(127,19,236,0.1)", border: "1px solid rgba(127,19,236,0.35)", color: C.violet }}>
                <Upload size={14} /> Import from file
                <input type="file" accept=".json" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) importData(f); }} />
              </label>
            </div>

            <div className="p-4 rounded-xl" style={{ background: "#111020", border: "1px solid rgba(127,19,236,0.15)" }}>
              <p className="text-sm font-bold text-slate-100 mb-1">PDF statement</p>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">Export a monthly commission summary for records.</p>
              <button onClick={() => alert("PDF export coming soon.")} className="w-full flex items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium" style={{ background: "rgba(0,242,255,0.07)", border: "1px solid rgba(0,242,255,0.3)", color: C.cyan }}>
                <FileText size={14} /> Export PDF — {formatMonth(selectedMonth || currentMonth)}
              </button>
            </div>

            <div className="p-4 rounded-xl" style={{ background: "#111020", border: "1px solid rgba(127,19,236,0.12)" }}>
              <p className="text-sm font-bold text-slate-100 mb-3">Sync status</p>
              {[
                ["Mode", isLocalMode ? "Local (browser only)" : "Cloud sync"],
                ["Status", saveStatus],
                ["Sales", String(state.sales.length)],
                ["Streak", `${state.streak || 0} days`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5">
                  <span className="text-xs text-slate-500">{k}</span>
                  <span className="text-xs text-slate-200 font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SETTINGS SCREEN ── */}
        {screen === "settings" && (
          <div className="flex-1 mt-2">
            <SettingsScreen settings={commissionSettings} onSave={handleSaveSettings} onboarding={showOnboarding} />
          </div>
        )}

        {/* ── DIAGNOSTIC SCREEN ── */}
        {screen === "diagnostic" && (
          <div className="flex-1 pb-8 space-y-3 mt-2">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-medium uppercase tracking-widest text-slate-500">System status</p>
              <button onClick={runDiagnostic} className="text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-lg" style={{ background: "rgba(127,19,236,0.15)", color: C.violet, border: "1px solid rgba(127,19,236,0.3)" }}>Re-run</button>
            </div>

            {[
              { label: "API status", value: diagnosticResult?.summary?.includes("✅") ? "Online" : diagnosticResult?.loading ? "Checking…" : "Unknown", ok: diagnosticResult?.summary?.includes("✅") },
              { label: "Auth token", value: diagnosticResult?.tokenPrefix ? `Valid (${diagnosticResult.tokenPrefix.slice(0, 12)}…)` : isLocalMode ? "Local mode" : "Pending", ok: !!diagnosticResult?.tokenPrefix || isLocalMode },
              { label: "Sales logged", value: String(state.sales.length), ok: true },
              { label: "Settings saved", value: commissionSettings.configured ? "Yes" : "Not configured", ok: commissionSettings.configured },
              { label: "Storage (local)", value: `${Math.round(JSON.stringify(localStorage).length / 1024)} KB`, ok: true },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-3 px-4 rounded-xl" style={{ background: "#111020", border: "1px solid rgba(127,19,236,0.1)" }}>
                <span className="text-xs text-slate-500">{item.label}</span>
                <span className="text-xs font-semibold" style={{ color: item.ok ? C.green : C.amber }}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle" style={{ background: item.ok ? C.green : C.amber }} />
                  {item.value}
                </span>
              </div>
            ))}

            {[
              { label: "Version", value: "v2.0.0" },
              { label: "User ID", value: clerkUser?.id?.slice(0, 16) || "local" },
              { label: "Environment", value: "Production" },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-3 px-4 rounded-xl" style={{ background: "#111020", border: "1px solid rgba(127,19,236,0.1)" }}>
                <span className="text-xs text-slate-500">{item.label}</span>
                <span className="text-xs font-semibold text-violet-400">{item.value}</span>
              </div>
            ))}

            {diagnosticResult?.apiResponse && (
              <details className="mt-2">
                <summary className="text-[9px] uppercase tracking-widest text-slate-500 cursor-pointer">Raw API response</summary>
                <pre className="mt-2 p-3 rounded-xl text-[8px] text-slate-400 overflow-auto" style={{ background: "rgba(10,6,18,0.8)", border: "1px solid rgba(127,19,236,0.12)", maxHeight: 200 }}>{JSON.stringify(diagnosticResult.apiResponse, null, 2)}</pre>
              </details>
            )}

            <button onClick={() => { try { localStorage.clear(); } catch {} alert("Local cache cleared. Refresh to reload."); }} className="w-full mt-2 py-3 rounded-xl text-sm font-medium" style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.22)", color: "rgba(239,68,68,0.7)" }}>
              Clear local cache
            </button>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {showAddSale && (
        <SaleModal mode="add" sale={null} initialData={newSale} isOpen={showAddSale} onClose={() => setShowAddSale(false)} onSave={saleInput => handleAddSale(saleInput as Omit<Sale, "id">)} settings={commissionSettings} />
      )}
      {editingSale && (
        <SaleModal mode="edit" sale={editingSale} initialData={{ date: editingSale.date, customer: editingSale.customer, stockNumber: editingSale.stockNumber || "", year: editingSale.year || "", make: editingSale.make || "", model: editingSale.model || "", downPayment: editingSale.downPayment, frontGross: editingSale.frontGross || 0, backGross: editingSale.backGross || 0, split: editingSale.split, notes: editingSale.notes }} isOpen={!!editingSale} onClose={() => setEditingSale(null)} onSave={saleInput => handleUpdateSale(saleInput)} onDelete={deleteSale} settings={commissionSettings} />
      )}
      {showAddBonus && (
        <AddBonusModal isOpen={showAddBonus} onClose={() => setShowAddBonus(false)} onSave={handleAddBonus} />
      )}
    </div>
  );
}
