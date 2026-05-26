import { createContext, useContext } from "react";
import type { Session } from "@supabase/supabase-js";

export const SessionContext = createContext<Session | null>(null);

export function useSession(): Session | null {
  return useContext(SessionContext);
}
