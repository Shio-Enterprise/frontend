import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './AuthContext';
import { WishlistProvider, useWishlist } from './WishlistContext';
import apiClient from '../lib/axios';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

const token = `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).replace(/=/g, '')}.signature`;
const wrapper = ({ children }) => <AuthProvider><WishlistProvider>{children}</WishlistProvider></AuthProvider>;

describe('WishlistContext', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify({ id: 'u1' }));
    apiClient.get.mockReset(); apiClient.post.mockReset(); apiClient.delete.mockReset();
    apiClient.get.mockResolvedValue({ data: { product_ids: ['p1'] } });
    apiClient.post.mockResolvedValue({ data: { id: 'w2' } });
    apiClient.delete.mockResolvedValue({ status: 204 });
  });

  it('bootstraps IDs once and guards duplicate clicks while pending', async () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });
    await waitFor(() => expect(result.current.isWishlisted('p1')).toBe(true));
    apiClient.delete.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ status: 204 }), 10)));
    await act(async () => { const first = result.current.toggleWishlist('p1'); const second = result.current.toggleWishlist('p1'); expect(await second).toBe(false); await first; });
    expect(apiClient.delete).toHaveBeenCalledTimes(1);
    expect(result.current.isWishlisted('p1')).toBe(false);
  });

  it('keeps state unchanged and exposes failure for retry after a mutation error', async () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });
    await waitFor(() => expect(result.current.isWishlisted('p1')).toBe(true));
    apiClient.delete.mockRejectedValueOnce(new Error('offline'));
    await act(async () => { expect(await result.current.toggleWishlist('p1')).toBe(false); });
    expect(result.current.isWishlisted('p1')).toBe(true);
    apiClient.delete.mockResolvedValueOnce({ status: 204 });
    await act(async () => { expect(await result.current.toggleWishlist('p1')).toBe(true); });
    expect(result.current.isWishlisted('p1')).toBe(false);
  });
});
