import { beforeEach, describe, expect, it, vi } from 'vitest';

const requestUse = vi.hoisted(() => vi.fn());
vi.mock('axios', () => ({
  default: { create: vi.fn(() => ({ interceptors: { request: { use: requestUse } } })) },
}));

import apiClient from './axios';

describe('apiClient authorization interceptor', () => {
  let interceptor;

  beforeEach(() => {
    localStorage.clear();
    interceptor = requestUse.mock.calls[0][0];
  });

  it('adds the current bearer token when a request has no explicit authorization', () => {
    localStorage.setItem('accessToken', 'session-token');
    const config = { headers: {} };

    expect(interceptor(config)).toBe(config);
    expect(config.headers.Authorization).toBe('Bearer session-token');
    expect(apiClient).toBeDefined();
  });

  it('preserves an explicit authorization header', () => {
    localStorage.setItem('accessToken', 'session-token');
    const config = { headers: { Authorization: 'Bearer captured-token' } };

    interceptor(config);

    expect(config.headers.Authorization).toBe('Bearer captured-token');
  });
});
