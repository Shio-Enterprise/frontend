import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { WishlistProvider, useWishlist } from './WishlistContext';
import apiClient from '../lib/axios';

vi.mock('../lib/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

const makeToken = (id) => `header.${btoa(JSON.stringify({ sub: id, exp: Math.floor(Date.now() / 1000) + 3600 })).replace(/=/g, '')}.signature`;
const Probe = () => {
  const auth = useAuth();
  const wishlist = useWishlist();
  return <>
    <button onClick={() => auth.login({ access: makeToken('u1'), refresh: makeToken('r1'), user: { id: 'u1' } })}>login A</button>
    <button onClick={() => auth.login({ access: makeToken('u2'), refresh: makeToken('r2'), user: { id: 'u2' } })}>login B</button>
    <button onClick={() => auth.logout()}>logout</button>
    <button onClick={() => wishlist.toggleWishlist('p1')}>toggle</button>
    <button onClick={() => wishlist.refreshWishlist()}>retry</button>
    <output data-testid="ids">{[...wishlist.ids].join(',')}</output>
  </>;
};
const wrapper = ({ children }) => <AuthProvider><WishlistProvider>{children}</WishlistProvider></AuthProvider>;

describe('Wishlist session boundaries', () => {
  beforeEach(() => {
    localStorage.clear();
    apiClient.get.mockReset(); apiClient.post.mockReset(); apiClient.delete.mockReset();
    apiClient.get.mockResolvedValue({ data: { product_ids: [] } });
    apiClient.post.mockResolvedValue({ data: { id: 'w1' } });
  });

  it('drops an old in-flight mutation after logout and login as another user', async () => {
    let resolvePost;
    apiClient.post.mockImplementationOnce(() => new Promise((resolve) => { resolvePost = resolve; }));
    render(<Probe />, { wrapper });
    await act(async () => { screen.getByRole('button', { name: 'login A' }).click(); });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
    await act(async () => { screen.getByRole('button', { name: 'toggle' }).click(); });
    await act(async () => { screen.getByRole('button', { name: 'logout' }).click(); });
    await act(async () => { screen.getByRole('button', { name: 'login B' }).click(); });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
    await act(async () => { resolvePost({ data: { id: 'old' } }); });
    expect(screen.getByTestId('ids')).toHaveTextContent('');
  });

  it('discards IDs received from the previous account', async () => {
    let resolveFirst;
    apiClient.get.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }));
    render(<Probe />, { wrapper });
    await act(async () => { screen.getByRole('button', { name: 'login A' }).click(); });
    await act(async () => { screen.getByRole('button', { name: 'logout' }).click(); });
    await act(async () => { screen.getByRole('button', { name: 'login B' }).click(); });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
    await act(async () => { resolveFirst({ data: { product_ids: ['stale'] } }); });
    expect(screen.getByTestId('ids')).toHaveTextContent('');
  });

  it('blocks mutations after a bootstrap failure until retry succeeds', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('offline'));
    render(<Probe />, { wrapper });
    await act(async () => { screen.getByRole('button', { name: 'login A' }).click(); });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1));
    await act(async () => { screen.getByRole('button', { name: 'toggle' }).click(); });
    expect(apiClient.post).not.toHaveBeenCalled();
    apiClient.get.mockResolvedValueOnce({ data: { product_ids: [] } });
    await act(async () => { screen.getByRole('button', { name: 'retry' }).click(); });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
    await act(async () => { screen.getByRole('button', { name: 'toggle' }).click(); });
    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['ids', () => apiClient.get.mockRejectedValueOnce({ response: { status: 401 } })],
    ['add', () => { apiClient.get.mockResolvedValueOnce({ data: { product_ids: [] } }); apiClient.post.mockRejectedValueOnce({ response: { status: 401 } }); }],
    ['remove', () => { apiClient.get.mockResolvedValueOnce({ data: { product_ids: ['p1'] } }); apiClient.delete.mockRejectedValueOnce({ response: { status: 401 } }); }],
  ])('logs out on a 401 from %s', async (_operation, setup) => {
    setup();
    render(<Probe />, { wrapper });
    await act(async () => { screen.getByRole('button', { name: 'login A' }).click(); });
    if (_operation === 'add' || _operation === 'remove') {
      await waitFor(() => expect(apiClient.get).toHaveBeenCalled());
      await act(async () => { screen.getByRole('button', { name: 'toggle' }).click(); });
    }
    await waitFor(() => expect(localStorage.getItem('accessToken')).toBeNull());
  });
});
