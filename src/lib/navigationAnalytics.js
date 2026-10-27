import apiClient from './axios';
import { getAccessToken } from './authToken';

const STORAGE_KEY = 'shio_anonymous_id';
const recentEvents = new Map();

export function anonymousNavigationId() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    const created = globalThis.crypto?.randomUUID?.()
      || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return null;
  }
}

function isAdminPath(path) {
  return path === '/admin' || path.startsWith('/admin/');
}

export function recordNavigationEvent({ eventType, path = '', product, variation } = {}) {
  if (!eventType || isAdminPath(path)) return;
  const key = [eventType, path, product || '', variation || ''].join('|');
  const now = Date.now();
  if (now - (recentEvents.get(key) || 0) < 1000) return;
  recentEvents.set(key, now);

  const anonymousId = getAccessToken() ? null : anonymousNavigationId();
  if (!getAccessToken() && !anonymousId) return;

  const body = { event_type: eventType, path };
  if (anonymousId) body.anonymous_id = anonymousId;
  if (product) body.product = product;
  if (variation) body.variation = variation;
  apiClient.post('/analytics/events/', body).catch(() => {});
}

export function linkAnonymousNavigation() {
  let anonymousId = null;
  try {
    anonymousId = localStorage.getItem(STORAGE_KEY);
  } catch {
    anonymousId = null;
  }
  if (!anonymousId || !getAccessToken()) return;
  apiClient.post('/analytics/link/', { anonymous_id: anonymousId }).catch(() => {});
}
