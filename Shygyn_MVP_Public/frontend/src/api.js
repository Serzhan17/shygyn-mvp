const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

export function getToken() { return localStorage.getItem('shygyn_token'); }
export function setToken(token) {
  if (token) localStorage.setItem('shygyn_token', token);
  else localStorage.removeItem('shygyn_token');
}

function humanError(data) {
  if (typeof data === 'string') return data;
  if (data?.detail) return data.detail;
  if (data && typeof data === 'object') {
    return Object.entries(data).map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join('; ') : messages}`).join(' · ');
  }
  return 'Произошла ошибка. Попробуйте снова.';
}

export async function api(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Token ${token}`;
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch (_) {
    throw new Error('Нет соединения с Django API. Проверьте, запущен ли сервер на порту 8000.');
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/login')) window.dispatchEvent(new Event('shygyn:unauthorized'));
    throw new Error(humanError(data));
  }
  return data;
}

export const post = (path, data) => api(path, { method: 'POST', body: JSON.stringify(data) });
export const patch = (path, data) => api(path, { method: 'PATCH', body: JSON.stringify(data) });
export const remove = (path) => api(path, { method: 'DELETE' });
