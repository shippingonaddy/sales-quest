import { useState, type FC } from "react";
import { X } from "lucide-react";
import type { Bonus } from "../types";
import { getLocalDateString } from "../lib/date";

interface AddBonusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bonus: Omit<Bonus, "id">) => void;
}

export const AddBonusModal: FC<AddBonusModalProps> = ({ isOpen, onClose, onSave }) => {
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
