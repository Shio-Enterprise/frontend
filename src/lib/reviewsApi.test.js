import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from './axios';
import {
  clearReply, createReview, deleteReview, getAdminReviews, getAllMyReviews, getProductReviews,
  getReviewSummary, removeReview, restoreReview, reviewErrorMessage, setReply, updateReview,
} from './reviewsApi';

vi.mock('./axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

describe('reviewsApi', () => {
  it('lista avaliações do produto sem mandar filtro vazio', async () => {
    apiClient.get.mockResolvedValue({ data: { count: 0, results: [] } });
    await getProductReviews('p1', { rating: null, page: 1 });
    expect(apiClient.get).toHaveBeenLastCalledWith('/reviews/products/p1/', { params: { page: 1 } });
    await getProductReviews('p1', { rating: 5, page: 2 });
    expect(apiClient.get).toHaveBeenLastCalledWith('/reviews/products/p1/', { params: { rating: 5, page: 2 } });
  });

  it('busca o resumo', async () => {
    apiClient.get.mockResolvedValue({ data: { rating_count: 3 } });
    await expect(getReviewSummary('p1')).resolves.toEqual({ rating_count: 3 });
    expect(apiClient.get).toHaveBeenCalledWith('/reviews/products/p1/summary/');
  });

  it('cria e edita enviando só rating, comment e fit', async () => {
    apiClient.post.mockResolvedValue({ data: { id: 'r1' } });
    apiClient.patch.mockResolvedValue({ data: { id: 'r1' } });
    const extra = { rating: 5, comment: 'Boa', fit: 'LARGE', status: 'PUBLISHED', user: 9 };
    await expect(createReview('p1', extra)).resolves.toEqual({ id: 'r1' });
    expect(apiClient.post).toHaveBeenCalledWith('/reviews/products/p1/', { rating: 5, comment: 'Boa', fit: 'LARGE' });
    await updateReview('r1', extra);
    expect(apiClient.patch).toHaveBeenCalledWith('/reviews/r1/', { rating: 5, comment: 'Boa', fit: 'LARGE' });
  });

  it('exclui a própria avaliação', async () => {
    apiClient.delete.mockResolvedValue({ status: 204 });
    await deleteReview('r1');
    expect(apiClient.delete).toHaveBeenCalledWith('/reviews/r1/');
  });

  it('junta todas as páginas de mine/', async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: { next: 'page2', results: [{ id: 'a' }] } })
      .mockResolvedValueOnce({ data: { next: null, results: [{ id: 'b' }] } });
    await expect(getAllMyReviews()).resolves.toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(apiClient.get.mock.calls).toEqual([
      ['/reviews/mine/', { params: { page: 1, page_size: 50 } }],
      ['/reviews/mine/', { params: { page: 2, page_size: 50 } }],
    ]);
  });

  it('chama as rotas de moderação', async () => {
    apiClient.get.mockResolvedValue({ data: { count: 0, results: [] } });
    apiClient.post.mockResolvedValue({ data: { id: 'r1' } });
    apiClient.put.mockResolvedValue({ data: { id: 'r1' } });
    apiClient.delete.mockResolvedValue({ data: { id: 'r1' } });

    await getAdminReviews({ status: 'REMOVED', rating: '', product: undefined, page: 1 });
    expect(apiClient.get).toHaveBeenCalledWith('/reviews/admin/', { params: { status: 'REMOVED', page: 1 } });
    await removeReview('r1', { reason: 'OTHER', note: 'Link' });
    expect(apiClient.post).toHaveBeenCalledWith('/reviews/admin/r1/remove/', { reason: 'OTHER', note: 'Link' });
    await restoreReview('r1');
    expect(apiClient.post).toHaveBeenLastCalledWith('/reviews/admin/r1/restore/');
    await setReply('r1', 'Obrigado!');
    expect(apiClient.put).toHaveBeenCalledWith('/reviews/admin/r1/reply/', { text: 'Obrigado!' });
    await clearReply('r1');
    expect(apiClient.delete).toHaveBeenCalledWith('/reviews/admin/r1/reply/');
  });
});

describe('reviewErrorMessage', () => {
  const failure = (status, data) => ({ response: { status, data } });

  it('usa a mensagem de domínio do backend', () => {
    expect(reviewErrorMessage(failure(403, { message: 'Só pedidos entregues.' }))).toBe('Só pedidos entregues.');
  });

  it('usa o primeiro erro de campo', () => {
    expect(reviewErrorMessage(failure(400, { note: ["Descreva o motivo quando escolher 'Outro'."] })))
      .toBe("Descreva o motivo quando escolher 'Outro'.");
  });

  it('explica o limite de envios', () => {
    expect(reviewErrorMessage(failure(429, { detail: 'Request was throttled.' })))
      .toBe('Você enviou muitas avaliações em pouco tempo. Tente de novo mais tarde.');
  });

  it('cai no texto padrão sem resposta do servidor', () => {
    expect(reviewErrorMessage(new Error('Network Error'))).toBe('Não foi possível salvar a avaliação.');
    expect(reviewErrorMessage(new Error('x'), 'Falhou.')).toBe('Falhou.');
  });
});
