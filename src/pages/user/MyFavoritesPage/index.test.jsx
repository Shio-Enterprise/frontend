import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import MyFavoritesPage from './index';
import apiClient from '../../../lib/axios';

vi.mock('../../../lib/axios', () => ({ default: { get: vi.fn() } }));
const { reconcileWishlist } = vi.hoisted(() => ({ reconcileWishlist: vi.fn(() => true) }));
vi.mock('../../../context/WishlistContext', () => ({
  useWishlist: () => ({ ids: new Set(), loading: false, idsError: null, refreshWishlist: vi.fn(), reconcileWishlist, revision: 0, sessionKey: 'u1:t', isAuthenticated: true }),
}));
vi.mock('../../../components/ui/ShioDesign', () => ({
  Icon: () => null,
  PageMarker: () => null,
  ProductCard: ({ product }) => <button>{product.name}</button>,
}));
vi.mock('../../../components/layout/user/AccountLayout', () => ({ default: ({ children }) => <main>{children}</main> }));

const response = (results, next = null, previous = null) => ({ data: { results, next, previous } });
const product = (id, name) => ({ id, name, base_price: '10.00', effective_price: '10.00', is_sellable: true });

describe('MyFavoritesPage', () => {
  beforeEach(() => apiClient.get.mockReset());

  it('renders empty state and retries after an API error', async () => {
    apiClient.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(response([]));
    render(<MemoryRouter><MyFavoritesPage /></MemoryRouter>);
    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível/i);
    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }));
    expect(await screen.findByText(/você ainda não tem favoritos/i)).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });

  it('renders a current server result when the cached IDs are stale', async () => {
    apiClient.get.mockResolvedValueOnce(response([{ id: 'p1', product: product('p1', 'Camiseta') } ]));
    render(<MemoryRouter><MyFavoritesPage /></MemoryRouter>);
    expect(await screen.findByRole('button', { name: 'Camiseta' })).toBeInTheDocument();
    expect(reconcileWishlist).toHaveBeenCalledWith(['p1'], 0);
  });

  it('corrects pagination when the current page becomes empty', async () => {
    apiClient.get.mockResolvedValueOnce(response([{ id: 'p1', product: product('p1', 'Camiseta') }], '/catalog/wishlist/?page=2', null));
    apiClient.get.mockResolvedValueOnce(response([]));
    apiClient.get.mockResolvedValueOnce(response([{ id: 'p0', product: product('p0', 'Boné') }]));
    render(<MemoryRouter><MyFavoritesPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /próxima/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Boné' })).toBeInTheDocument());
    expect(apiClient.get).toHaveBeenLastCalledWith('/catalog/wishlist/', { params: { page: 1, page_size: 12 }, signal: expect.any(AbortSignal) });
  });
});
