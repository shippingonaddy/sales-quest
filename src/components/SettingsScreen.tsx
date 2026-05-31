import { useState, type FC } from "react";
import { Save } from "lucide-react";
import type { CommissionSettings } from "../types";
import { C } from "../lib/theme";
import { supabase } from "../lib/supabase";

interface SettingsScreenProps {
  settings: CommissionSettings;
  onSave: (s: CommissionSettings) => void;
  onboarding?: boolean;
  initialDisplayName?: string;
  onToast?: (msg: string, type: "success" | "error") => void;
}

export const SettingsScreen: FC<SettingsScreenProps> = ({ settings, onSave, onboarding, initialDisplayName = "", onToast }) => {
  const [local, setLocal] = useState<CommissionSettings>({ ...settings });
  const [saved, setSaved] = useState(false);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [nameSaving, setNameSaving] = useState(false);

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setNameSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: displayName.trim() } });
    setNameSaving(false);
    if (error) { onToast?.("Failed to save name.", "error"); return; }
    onToast?.("Name saved.", "success");
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

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
      <p className={secLabel}>Account</p>
      <div className="p-4 rounded-xl space-y-3" style={{ background: "#111020", border: "1px solid rgba(127,19,236,0.12)" }}>
        <div>
          <label className="text-[9px] text-slate-500 uppercase tracking-wide block mb-1">Display name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              className={inp + " flex-1"}
              style={inpStyle}
            />
            <button
              onClick={handleSaveName}
              disabled={nameSaving || !displayName.trim()}
              className="px-4 rounded-lg text-sm font-medium text-slate-100 disabled:opacity-40"
              style={{ background: "rgba(127,19,236,0.2)", border: "1px solid rgba(127,19,236,0.4)" }}
            >
              {nameSaving ? "…" : "Save"}
            </button>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-red-400"
          style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)" }}
        >
          Sign out
        </button>
      </div>

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
      <div>
        <label className="text-[9px] text-slate-500 uppercase tracking-wide block mb-1">Current period end</label>
        <input type="date" value={local.payPeriodEnd || ""} onChange={e => setLocal(p => ({ ...p, payPeriodEnd: e.target.value }))} className={inp} style={inpStyle} />
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
