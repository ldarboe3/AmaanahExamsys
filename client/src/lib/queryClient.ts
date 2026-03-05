import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { enqueueOfflineMutation } from "./offlineQueue";

function handleUnauthorized() {
  queryClient.setQueryData(["/api/auth/user"], null);
  queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  if (window.location.pathname !== "/" && window.location.pathname !== "/login" && window.location.pathname !== "/result-checker") {
    window.location.href = "/login";
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401) {
      handleUnauthorized();
    }
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { offlineLabel?: string; skipOfflineQueue?: boolean }
): Promise<Response> {
  const queueOffline = async () => {
    const id = await enqueueOfflineMutation(method, url, data, options?.offlineLabel);
    return new Response(JSON.stringify({ __offline: true, __queueId: id, id: id * -1 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Offline-Queued': 'true' },
    });
  };

  if (!navigator.onLine && !options?.skipOfflineQueue && method !== 'GET') {
    return queueOffline();
  }

  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (err) {
    if (!navigator.onLine && !options?.skipOfflineQueue && method !== 'GET') {
      return queueOffline();
    }
    throw err;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    if (res.status === 401 && unauthorizedBehavior === "throw") {
      handleUnauthorized();
    }

    if (!res.ok) {
      if (res.headers.get('X-Offline') === 'true') {
        try { return await res.json(); } catch { return null; }
      }
      await throwIfResNotOk(res);
    }

    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
