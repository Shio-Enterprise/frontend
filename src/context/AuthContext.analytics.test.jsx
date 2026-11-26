import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import apiClient from '../lib/axios';

vi.mock('../lib/axios', () => ({ default: { post: vi.fn() } }));

const makeToken = (exp) => `header.${btoa(JSON.stringify({ exp })).replace(/=/g, '')}.signature`;
const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe('AuthProvider e consentimento de navegação', () => {
  let fetchMock;

  beforeEach(() => {
    localStorage.clear();
    apiClient.post.mockReset();
    apiClient.post.mockResolvedValue({ status: 204 });
    fetchMock = vi.fn((url) =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            /consent/.test(url)
              ? { choice: 'granted', version: '1', current_version: '1', created_at: null }
              : { linked: 0 },
          ),
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('no login, sincroniza o consentimento antes de vincular os eventos anônimos', async () => {
    localStorage.setItem('analyticsAnonymousId', 'navegador-1');
    const access = makeToken(Math.floor(Date.now() / 1000) + 3600);
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      result.current.login({ access, refresh: access, user: { id: 'u1' } });
    });

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/analytics\/consent\/\?anonymous_id=navegador-1$/);
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/api\/analytics\/link\/$/);
    expect(localStorage.getItem('analyticsConsent')).toBe('granted');
  });

  it('no logout, apaga a escolha local e o identificador anônimo', async () => {
    const access = makeToken(Math.floor(Date.now() / 1000) + 3600);
    localStorage.setItem('analyticsConsent', 'granted');
    localStorage.setItem('analyticsConsentVersion', '1');
    localStorage.setItem('analyticsAnonymousId', 'navegador-1');
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      result.current.login({ access, refresh: access, user: { id: 'u1' } });
    });
    await act(async () => {
      await result.current.logout();
    });

    expect(localStorage.getItem('analyticsConsent')).toBeNull();
    expect(localStorage.getItem('analyticsConsentVersion')).toBeNull();
    expect(localStorage.getItem('analyticsAnonymousId')).toBeNull();
  });
});
