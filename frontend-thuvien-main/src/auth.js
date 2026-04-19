export function parseJwtPayload(token) {
  try {
    const payload = token?.split('.')?.[1];
    if (!payload) return null;
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
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

export function getAuthHeaders() {
  const token = localStorage.getItem('access_token');

  if (!token) {
    return null;
  }

  return { Authorization: `Bearer ${token}` };
}

export function clearAuthStorage() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('username');
  localStorage.removeItem('role');
}