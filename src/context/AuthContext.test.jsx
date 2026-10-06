import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import apiClient from '../lib/axios';

vi.mock('../lib/axios', () => ({ default: { post: vi.fn() } }));

const makeToken = (exp) => `header.${btoa(JSON.stringify({ exp })).replace(/=/g, '')}.signature`;
const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe('AuthProvider session lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
    apiClient.post.mockReset();
    vi.useRealTimers();
  });

  it('clears local session before a pending logout request and keeps its captured authorization', async () => {
    const access = makeToken(Math.floor(Date.now() / 1000) + 3600);
    const refresh = makeToken(Math.floor(Date.now() / 1000) + 7200);
    let resolveLogout;
    apiClient.post.mockReturnValueOnce(new Promise((resolve) => { resolveLogout = resolve; }));
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => result.current.login({ access, refresh, user: { id: 'u1' } }));
    await act(async () => { void result.current.logout(); });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout/', { refresh }, {
      headers: { Authorization: `Bearer ${access}` },
    });
    await act(async () => { resolveLogout({ status: 204 }); });
  });

  it('expires an authenticated session and clears its user', async () => {
    vi.useFakeTimers();
    const now = Date.now();
    vi.setSystemTime(now);
    const access = makeToken(Math.floor((now + 10000) / 1000));
    localStorage.setItem('accessToken', access);
    localStorage.setItem('user', JSON.stringify({ id: 'u1' }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toEqual({ id: 'u1' });

    await act(async () => { vi.advanceTimersByTime(10001); });

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});
