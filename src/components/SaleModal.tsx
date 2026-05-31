import { useState, useEffect, type FC } from "react";
import { X } from "lucide-react";
import type { Sale, CommissionSettings } from "../types";
import { getSaleCommission } from "../lib/commission";
import { C } from "../lib/theme";

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

export const SaleModal: FC<SaleModalProps> = ({ mode, sale, initialData, isOpen, onClose, onSave, onDelete, settings }) => {
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
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wide block mb-1.5">Down payment ($)</label>
            <input type="number" placeholder="0.00" value={formData.downPayment || ""} onChange={e => setFormData(p => ({ ...p, downPayment: Number(e.target.value) }))} className={inp} style={inpStyle} />
          </div>
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
