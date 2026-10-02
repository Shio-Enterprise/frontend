import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getProductReviews, getReviewSummary } from '../../lib/reviewsApi';
import ProductReviews from './ProductReviews';

vi.mock('../../lib/reviewsApi', () => ({
  getProductReviews: vi.fn(),
  getReviewSummary: vi.fn(),
}));

const review = (id, author, rating = 5) => ({
  id, rating, comment: '', fit: '', author_name: author, purchased_size: 'M',
  verified_purchase: true, admin_reply: '', created_at: '2026-09-20T12:00:00Z',
});
const summary = (count = 2) => ({
  rating_avg: count ? '4.50' : '0.00',
  rating_count: count,
  distribution: { 1: 0, 2: 0, 3: 0, 4: count ? 1 : 0, 5: count ? 1 : 0 },
  fit: { SMALL: 0, TRUE_TO_SIZE: 0, LARGE: 0 },
});
const page = (results, count = results.length) => ({ count, next: null, previous: null, results });

beforeEach(() => {
  vi.clearAllMocks();
  getReviewSummary.mockResolvedValue(summary());
  getProductReviews.mockResolvedValue(page([review('r1', 'Ana'), review('r2', 'Bruno', 4)]));
});

describe('ProductReviews', () => {
  it('mostra resumo e avaliações publicadas', async () => {
    render(<ProductReviews productId="p1" />);
    expect(await screen.findByRole('heading', { name: 'Ana' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bruno' })).toBeInTheDocument();
    expect(screen.getByText('2 avaliações')).toBeInTheDocument();
    expect(getReviewSummary).toHaveBeenCalledWith('p1');
    expect(getProductReviews).toHaveBeenCalledWith('p1', { rating: null, page: 1 });
  });

  it('mostra estado vazio quando não há avaliações', async () => {
    getReviewSummary.mockResolvedValue(summary(0));
    getProductReviews.mockResolvedValue(page([]));
    render(<ProductReviews productId="p1" />);
    expect(await screen.findByText('Ainda não há avaliações para este produto.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Todas' })).not.toBeInTheDocument();
  });

  it('filtra por estrela e volta para a página 1', async () => {
    getProductReviews.mockResolvedValue(page([review('r1', 'Ana')], 25));
    render(<ProductReviews productId="p1" />);
    await screen.findByRole('heading', { name: 'Ana' });
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    await waitFor(() => expect(getProductReviews).toHaveBeenLastCalledWith('p1', { rating: null, page: 2 }));
    await screen.findByText('Página 2 de 3');
    fireEvent.click(screen.getByRole('button', { name: '5 estrelas' }));
    await waitFor(() => expect(getProductReviews).toHaveBeenLastCalledWith('p1', { rating: 5, page: 1 }));
    expect(screen.getByRole('button', { name: '5 estrelas' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('avisa quando o filtro não tem resultados', async () => {
    render(<ProductReviews productId="p1" />);
    await screen.findByRole('heading', { name: 'Ana' });
    getProductReviews.mockResolvedValue(page([]));
    fireEvent.click(screen.getByRole('button', { name: '1 estrela' }));
    expect(await screen.findByText('Nenhuma avaliação com essa nota.')).toBeInTheDocument();
  });

  it('mostra erro quando a API falha', async () => {
    getReviewSummary.mockRejectedValue(new Error('offline'));
    render(<ProductReviews productId="p1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as avaliações.');
  });

  it('ignora a resposta antiga depois de trocar o filtro', async () => {
    let resolveFirst;
    getProductReviews
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce(page([review('r9', 'Carla')]));
    render(<ProductReviews productId="p1" />);
    fireEvent.click(await screen.findByRole('button', { name: '5 estrelas' }));
    expect(await screen.findByRole('heading', { name: 'Carla' })).toBeInTheDocument();
    await act(async () => resolveFirst(page([review('r1', 'Ana')])));
    expect(screen.queryByRole('heading', { name: 'Ana' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Carla' })).toBeInTheDocument();
  });
});
