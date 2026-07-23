const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err: any) {
    const networkError = new Error('Sunucuya bağlanılamadı.');
    (networkError as any).isNetworkError = true;
    throw networkError;
  }

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }
    const apiError = new Error(data.message || 'Bir hata oluştu.');
    (apiError as any).statusCode = response.status;
    throw apiError;
  }

  return data as T;
}
