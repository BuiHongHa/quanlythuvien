export function parseJwtPayload(token) {
  try {
    const payload = token?.split('.')?.[1];
    if (!payload) return null;
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  try {
    const response = await fetch('http://127.0.0.1:8000/api/token/refresh/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('access_token', data.access);
      return data.access;
    }
  } catch (error) {
    console.error('Failed to refresh token:', error);
  }
  return null;
}

export function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();

  if (['librarian', 'admin', 'manager', 'staff'].includes(value)) {
    return 'librarian';
  }

  if (['reader', 'student', 'member', 'user'].includes(value)) {
    return 'reader';
  }

  return 'reader';
}

export function getAuthRole() {
  const token = localStorage.getItem('access_token');
  const payload = parseJwtPayload(token);
  const storedRole = localStorage.getItem('role');
  const payloadRole = payload?.role || (payload?.is_staff ? 'librarian' : '');

  return normalizeRole(storedRole || payloadRole);
}

export function isAdminRole(role) {
  const normalized = normalizeRole(role);
  return normalized === 'librarian' || normalized === 'manager' || normalized === 'admin' || normalized === 'staff';
}

export async function getAuthHeaders() {
  let token = localStorage.getItem('access_token');

  if (!token) {
    return {};
  }

  if (isTokenExpired(token)) {
    token = await refreshAccessToken();
    if (!token) {
      clearAuthStorage();
      return {};
    }
  }

  return { headers: { Authorization: `Bearer ${token}` } };
}

export function clearAuthStorage() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('username');
  localStorage.removeItem('role');
}