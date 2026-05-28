import { useState, useRef, useCallback } from "react";
import type { Toast, ToastVariant } from "../types";

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);
  const show = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = ++counter.current;
    setToasts(prev => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, show };
}
