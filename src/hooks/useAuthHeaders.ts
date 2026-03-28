import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";

export function useAuthHeaders(): () => Promise<HeadersInit> {
  const { isSignedIn, getToken } = useAuth();

  // Keep getToken in a ref so getAuthHeaders doesn't change identity every render.
  // getToken is a stable Clerk function but its reference changes each render,
  // which would otherwise cascade into every hook that depends on getAuthHeaders.
  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; });

  const getAuthHeaders = useCallback(async (): Promise<HeadersInit> => {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "X-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    if (isSignedIn) {
      try {
        const token = await getTokenRef.current();
        if (token) { headers.Authorization = `Bearer ${token}`; headers["X-Clerk-Token"] = token; }
      } catch (err) { console.error("Failed to get Clerk token:", err); }
    }
    return headers;
  }, [isSignedIn]);

  return getAuthHeaders;
}
