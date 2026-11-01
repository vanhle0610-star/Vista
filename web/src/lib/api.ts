export type Problem = {
  title: string;
  detail: string;
  status: number;
  code: string;
  requestId: string;
};

const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8081/api/v1').replace(/\/+$/, '');

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refreshToken = localStorage.getItem('vista_refresh_token');
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ refreshToken }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.accessToken) {
        localStorage.setItem('vista_token', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('vista_refresh_token', data.refreshToken);
        }
        document.cookie = `vista_token=${data.accessToken}; path=/; max-age=604800; SameSite=Lax`;
        window.dispatchEvent(new Event('vista-auth-change'));
        return data.accessToken;
      }
    }
  } catch {
    // Network or server error
  }

  return null;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init?.headers as Record<string, string>),
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('vista_token') || localStorage.getItem('vista_access_token');
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: init?.credentials ?? 'include',
    headers,
  });

  // If unauthorized and not an auth endpoint, attempt transparent token refresh
  if (response.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth/')) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = refreshAccessToken().finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
    }

    const newToken = await refreshPromise;
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        credentials: init?.credentials ?? 'include',
        headers,
      });
    } else if (headers['Authorization']) {
      // Refresh failed -> clear session and retry unauthenticated fallback
      localStorage.removeItem('vista_token');
      localStorage.removeItem('vista_access_token');
      localStorage.removeItem('vista_refresh_token');
      localStorage.removeItem('vista_user');
      document.cookie = 'vista_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      window.dispatchEvent(new Event('vista-auth-change'));
      delete headers['Authorization'];
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        credentials: init?.credentials ?? 'include',
        headers,
      });
    }
  }

  if (!response.ok) {
    const problem = (await response
      .json()
      .catch(() => ({ detail: `Lỗi kết nối máy chủ (${response.status})` }))) as Partial<Problem>;
    throw Object.assign(new Error(problem.detail ?? `API error ${response.status}`), { status: response.status, code: problem.code });
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
