// Lightweight fetch wrapper that attaches stored token from localStorage and the configured API base URL.
export async function apiFetch(path: string, options: RequestInit = {}) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;

  const headers = new Headers(options.headers || {});
  try {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('profitPilotToken') : null;
    if (token) headers.set('Authorization', `Bearer ${token}`);
  } catch (e) {
    // noop - localStorage might not be available in SSR
  }

  const opts: RequestInit = { ...options, headers };
  const resp = await fetch(url, opts);
  const text = await resp.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = text;
  }

  if (!resp.ok) {
    const message = data?.message || data?.error || text || resp.statusText;
    const error = new Error(message);
    (error as any).status = resp.status;
    (error as any).body = data;
    throw error;
  }

  return data;
}
