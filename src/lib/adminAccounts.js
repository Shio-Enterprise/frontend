import { getAccessToken } from './authToken';

// Criar, promover e remover administradores pelo painel (#81).
const API_BASE_URL = import.meta.env.VITE_API_URL;
const ADMINS_URL = `${API_BASE_URL}/api/auth/admins/`;

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getAccessToken()}`,
  };
}

// Primeira mensagem útil do corpo de erro do DRF ({campo: [msg]} ou {detail}).
export function adminAccountErrorMessage(payload, fallback) {
  if (!payload || typeof payload !== 'object') return fallback;
  if (typeof payload.detail === 'string') return payload.detail;
  for (const field of ['email', 'name', 'admin_permissions', 'non_field_errors']) {
    const value = payload[field];
    if (Array.isArray(value) && value[0]) return String(value[0]);
    if (typeof value === 'string' && value) return value;
  }
  return fallback;
}

async function request(url, options, fallback) {
  const response = await fetch(url, { ...options, headers: authHeaders() });
  const payload = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(adminAccountErrorMessage(payload, fallback));
  return payload;
}

export function lookupAdminEmail(email) {
  const query = new URLSearchParams({ email: email.trim() });
  return request(
    `${ADMINS_URL}lookup/?${query}`,
    { method: 'GET' },
    'Não foi possível verificar o e-mail.',
  );
}

// Conta existente vira admin (action "promoted"); e-mail novo cria a conta (action "created").
export function createAdmin({ email, name, adminPermissions }) {
  const body = { email: email.trim(), admin_permissions: adminPermissions };
  if (name?.trim()) body.name = name.trim();
  return request(
    ADMINS_URL,
    { method: 'POST', body: JSON.stringify(body) },
    'Não foi possível salvar o administrador.',
  );
}

export function removeAdminAccess(id) {
  return request(
    `${ADMINS_URL}${id}/`,
    { method: 'DELETE' },
    'Não foi possível remover o acesso.',
  );
}
