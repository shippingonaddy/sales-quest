import { useState, useRef, type FC, type TouchEvent } from "react";
import { Pencil, X } from "lucide-react";
import type { Sale, CommissionSettings } from "../types";
import { getSaleCommission } from "../lib/commission";
import { C, hexToRgb } from "../lib/theme";

interface SwipeSaleCardProps {
  sale: Sale;
  onEdit: () => void;
  onDelete: () => void;
  settings: CommissionSettings;
  isArchived: boolean;
}

export const SwipeSaleCard: FC<SwipeSaleCardProps> = ({ sale, onEdit, onDelete, settings, isArchived }) => {
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
