import { useCallback } from "react";
import { useSession } from "../lib/session";

export function useAuthHeaders(): () => Promise<HeadersInit> {
  const session = useSession();

  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "X-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    return headers;
  }, [session]);

  return getAuthHeaders;
}
