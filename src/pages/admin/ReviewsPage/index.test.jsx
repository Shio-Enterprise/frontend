import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { clearReply, getAdminReviews, removeReview, restoreReview, setReply } from '../../../lib/reviewsApi';
import ReviewsPage from './index';

vi.mock('../../../lib/reviewsApi', async (importOriginal) => ({
  ...(await importOriginal()),
  getAdminReviews: vi.fn(),
  removeReview: vi.fn(),
  restoreReview: vi.fn(),
  setReply: vi.fn(),
  clearReply: vi.fn(),
}));

const adminReview = (overrides = {}) => ({
  id: 'r1', rating: 1, comment: 'Péssimo, compre na loja X', fit: '', author_name: 'Maria Silva',
  author_email: 'maria@exemplo.com', purchased_size: 'M', verified_purchase: true,
  admin_reply: '', admin_reply_at: null, created_at: '2026-09-20T12:00:00Z', updated_at: '2026-09-20T12:00:00Z',
  product_id: 'p1', product_name: 'Camiseta Shio', status: 'PUBLISHED', removal_reason: null,
  removal_reason_label: null, removal_note: '', removed_at: null, removed_by_name: null, ...overrides,
});
const page = (results) => ({ count: results.length, next: null, previous: null, results });
const mount = () => render(<MemoryRouter><ReviewsPage /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  getAdminReviews.mockResolvedValue(page([adminReview()]));
});

describe('ReviewsPage', () => {
  it('carrega publicadas e troca para removidas', async () => {
    mount();
    expect(await screen.findByText('Péssimo, compre na loja X')).toBeInTheDocument();
    expect(getAdminReviews).toHaveBeenLastCalledWith({ status: 'PUBLISHED', rating: undefined, product: undefined, page: 1 });
    expect(screen.getByRole('tab', { name: 'Publicadas' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'Removidas' }));
    await waitFor(() => expect(getAdminReviews).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'REMOVED', page: 1 })));
  });

  it('filtra por nota e por produto', async () => {
    mount();
    await screen.findByText('Péssimo, compre na loja X');
    fireEvent.change(screen.getByLabelText('Filtrar por nota'), { target: { value: '1' } });
    await waitFor(() => expect(getAdminReviews).toHaveBeenLastCalledWith(expect.objectContaining({ rating: '1' })));
    fireEvent.click(await screen.findByRole('button', { name: 'Ver só Camiseta Shio' }));
    await waitFor(() => expect(getAdminReviews).toHaveBeenLastCalledWith(expect.objectContaining({ product: 'p1' })));
    expect(screen.getByText('Produto: Camiseta Shio')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtro de produto' }));
    await waitFor(() => expect(getAdminReviews).toHaveBeenLastCalledWith(expect.objectContaining({ product: undefined })));
  });

  it('exige detalhes ao remover com motivo "Outro"', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Remover' }));
    const modal = screen.getByRole('dialog', { name: 'Remover avaliação' });
    const confirm = within(modal).getByRole('button', { name: 'Remover da loja' });
    expect(confirm).toBeDisabled();
    fireEvent.click(within(modal).getByRole('radio', { name: 'Outro' }));
    expect(confirm).toBeDisabled();
    fireEvent.change(within(modal).getByLabelText(/Detalhes/), { target: { value: '   ' } });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(modal).getByLabelText(/Detalhes/), { target: { value: ' Link para concorrente ' } });
    expect(confirm).toBeEnabled();
    removeReview.mockResolvedValueOnce(adminReview({ status: 'REMOVED' }));
    fireEvent.click(confirm);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(removeReview).toHaveBeenCalledWith('r1', { reason: 'OTHER', note: 'Link para concorrente' });
    expect(getAdminReviews).toHaveBeenCalledTimes(2);
  });

  it('remove com motivo comum sem detalhes', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Remover' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Spam ou propaganda' }));
    removeReview.mockResolvedValueOnce(adminReview({ status: 'REMOVED' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remover da loja' }));
    await waitFor(() => expect(removeReview).toHaveBeenCalledWith('r1', { reason: 'SPAM', note: '' }));
  });

  it('restaura avaliação removida', async () => {
    getAdminReviews.mockResolvedValue(page([adminReview({
      status: 'REMOVED', removal_reason_label: 'Spam ou propaganda', removed_by_name: 'Admin Shio',
    })]));
    mount();
    expect(await screen.findByText('Removida pela loja: Spam ou propaganda · por Admin Shio')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Responder' })).not.toBeInTheDocument();
    restoreReview.mockResolvedValueOnce(adminReview());
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));
    await waitFor(() => expect(restoreReview).toHaveBeenCalledWith('r1'));
    await waitFor(() => expect(getAdminReviews).toHaveBeenCalledTimes(2));
  });

  it('responde e apaga a resposta', async () => {
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Responder' }));
    const save = screen.getByRole('button', { name: 'Salvar resposta' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Resposta da Shio'), { target: { value: ' Obrigado pelo retorno! ' } });
    setReply.mockResolvedValueOnce(adminReview({ admin_reply: 'Obrigado pelo retorno!' }));
    getAdminReviews.mockResolvedValue(page([adminReview({ admin_reply: 'Obrigado pelo retorno!' })]));
    fireEvent.click(save);
    await waitFor(() => expect(setReply).toHaveBeenCalledWith('r1', 'Obrigado pelo retorno!'));
    expect(await screen.findByText('Obrigado pelo retorno!')).toBeInTheDocument();
    clearReply.mockResolvedValueOnce(adminReview());
    fireEvent.click(screen.getByRole('button', { name: 'Apagar resposta' }));
    await waitFor(() => expect(clearReply).toHaveBeenCalledWith('r1'));
  });

  it('mostra o erro do backend quando a ação falha', async () => {
    getAdminReviews.mockResolvedValue(page([adminReview({ status: 'REMOVED', removal_reason_label: 'Spam ou propaganda' })]));
    restoreReview.mockRejectedValueOnce({ response: { status: 400, data: { message: 'A avaliação já está publicada.' } } });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Restaurar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('A avaliação já está publicada.');
  });

  it('volta uma página quando a página atual não existe mais (404)', async () => {
    const many = Array.from({ length: 10 }, (_, n) => adminReview({ id: `r${n}`, comment: `Comentário ${n}` }));
    getAdminReviews.mockResolvedValueOnce({ count: 11, next: 'x', previous: null, results: many });
    mount();
    await screen.findByText('Comentário 0');
    getAdminReviews.mockRejectedValueOnce({ response: { status: 404, data: {} } });
    getAdminReviews.mockResolvedValue({ count: 10, next: null, previous: null, results: many });
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    await waitFor(() => expect(getAdminReviews).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })));
    await waitFor(() => expect(getAdminReviews).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })));
    expect(await screen.findByText('Comentário 0')).toBeInTheDocument();
    expect(screen.queryByText('Não foi possível carregar as avaliações.')).not.toBeInTheDocument();
  });
});
