import type { FC } from "react";
import type { Toast } from "../types";

export const ToastContainer: FC<{ toasts: Toast[] }> = ({ toasts }) => (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
    {toasts.map(t => (
      <div key={t.id} className="px-4 py-3 rounded-xl text-sm font-medium shadow-lg pointer-events-auto animate-in fade-in slide-in-from-top-2"
        style={{
          background: t.variant === "error" ? "rgba(239,68,68,0.15)" : t.variant === "success" ? "rgba(16,185,129,0.15)" : "rgba(127,19,236,0.15)",
          border: `1px solid ${t.variant === "error" ? "rgba(239,68,68,0.4)" : t.variant === "success" ? "rgba(16,185,129,0.4)" : "rgba(127,19,236,0.4)"}`,
          color: t.variant === "error" ? "#f87171" : t.variant === "success" ? "#34d399" : "#c4b5fd",
          backdropFilter: "blur(12px)",
        }}>
        {t.message}
      </div>
    ))}
  </div>
);
