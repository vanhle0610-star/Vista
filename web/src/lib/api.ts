export type Problem = {
  title: string;
  detail: string;
  status: number;
  code: string;
  requestId: string;
};

const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8081/api/v1').replace(/\/+$/, '');

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init?.headers as Record<string, string>),
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('vista_token');
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  let response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && typeof window !== 'undefined' && headers['Authorization']) {
    localStorage.removeItem('vista_token');
    localStorage.removeItem('vista_access_token');
    delete headers['Authorization'];
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers,
    });
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
