export type Problem = {
  title: string;
  detail: string;
  status: number;
  code: string;
  requestId: string;
};

const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8081/api/v1').replace(/\/+$/, '');
const sessionExpired = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.';
let refreshInFlight: Promise<string | null> | null = null;

function clearSession() {
  localStorage.removeItem('vista_token');
  localStorage.removeItem('vista_user');
  document.cookie = 'vista_token=; path=/; max-age=0; SameSite=Lax';
  window.dispatchEvent(new Event('vista-auth-change'));
}

async function responseError(response: Response): Promise<Error> {
  const problem = (await response.json().catch(() => ({}))) as Partial<Problem>;
  return Object.assign(
    new Error(response.status === 401 ? sessionExpired : problem.detail ?? `Lỗi kết nối máy chủ (${response.status})`),
    { status: response.status, code: problem.code },
  );
}

function refreshAccessToken(previousToken: string): Promise<string | null> {
  if (!refreshInFlight) {
    // Share one refresh because the backend rotates and revokes the old refresh token.
    refreshInFlight = (async () => {
      const response = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (response.status === 401 || response.status === 403) {
        if (localStorage.getItem('vista_token') === previousToken) clearSession();
        return null;
      }
      if (!response.ok) throw await responseError(response);
      const data = (await response.json()) as { accessToken: string };
      if (!data.accessToken) throw new Error('Không thể làm mới phiên đăng nhập. Vui lòng thử lại.');
      // A logout or a new login while refreshing must take precedence.
      if (localStorage.getItem('vista_token') !== previousToken) {
        return localStorage.getItem('vista_token');
      }
      localStorage.setItem('vista_token', data.accessToken);
      document.cookie = `vista_token=${data.accessToken}; path=/; SameSite=Lax`;
      window.dispatchEvent(new Event('vista-auth-change'));
      return data.accessToken;
    })().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  let sessionToken: string | null = null;

  if (typeof window !== 'undefined' && !headers.has('Authorization')) {
    const token = localStorage.getItem('vista_token');
    if (token) {
      sessionToken = token;
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const request = () => fetch(`${baseUrl}${path}`, {
    credentials: 'include',
    ...init,
    headers,
  });
  let response = await request();

  const isAuthAction = /^\/auth\/(?:login|register|google|refresh(?:-token)?|logout)(?:[/?]|$)/.test(path);
  if (response.status === 401 && sessionToken && !isAuthAction) {
    // A parallel request may already have refreshed the token.
    const currentToken = localStorage.getItem('vista_token');
    const token = currentToken === sessionToken
      ? await refreshAccessToken(sessionToken)
      : currentToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
      response = await request();
      if (response.status === 401 && localStorage.getItem('vista_token') === token) clearSession();
    }
  }

  if (!response.ok) {
    throw await responseError(response);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
