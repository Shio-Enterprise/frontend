import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  MemoryRouter,
  Route,
  Routes,
} from 'react-router-dom';

import {
  createReview,
  deleteReview,
  getAllMyReviews,
  updateReview,
} from '../../../lib/reviewsApi';

import OrderDetailsPage from './index';

vi.mock('../../../components/layout/user/AccountLayout', () => ({
  default: ({ children }) => <main>{children}</main>,
}));

vi.mock('../../../lib/authToken', () => ({
  getAccessToken: () => 'token',
}));

vi.mock('../../../lib/reviewsApi', async (importOriginal) => ({
  ...(await importOriginal()),
  createReview: vi.fn(),
  updateReview: vi.fn(),
  deleteReview: vi.fn(),
  getAllMyReviews: vi.fn(),
}));

const item = (overrides = {}) => ({
  id: 'i1',
  product_id: 'p1',
  product_name: 'Camiseta Shio',
  sku_snapshot: 'CAM-M',
  quantity: 1,
  unit_price: '100.00',
  updated_at: '2026-09-01T10:00:00Z',
  can_review: true,
  review_id: null,
  ...overrides,
});

const order = (items) => ({
  id: 'abcdef12-0000-0000-0000-000000000000',
  status: 'DELIVERED',
  created_at: '2026-09-01T10:00:00Z',
  items,
  status_logs: [],
  tracking_code: null,
  payment: null,
  subtotal: '100.00',
  shipping_cost: '0.00',
  discount_amount: '0.00',
  total_amount: '100.00',
  shipping_street: 'Rua A',
  shipping_number: '1',
  shipping_complement: '',
  shipping_neighborhood: 'Centro',
  shipping_city: 'Brasília',
  shipping_state: 'DF',
  shipping_zip_code: '70000-000',
});

const mine = (overrides = {}) => ({
  id: 'r1',
  product_id: 'p1',
  product_name: 'Camiseta Shio',
  rating: 2,
  comment: 'Compre em x.com',
  fit: '',
  status: 'PUBLISHED',
  removal_reason_label: null,
  removal_note: '',
  ...overrides,
});

const mount = (items) => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => order(items),
      }),
    ),
  );

  return render(
    <MemoryRouter initialEntries={['/my-orders/abcdef12']}>
      <Routes>
        <Route
          path="/my-orders/:id"
          element={<OrderDetailsPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
};

const WARNING =
  'Não foi possível carregar sua avaliação. Ao salvar, o comentário e o caimento anteriores serão substituídos.';

const dialog = (name) =>
  screen.getByRole('dialog', { name });

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('OrderDetailsPage', () => {
  it('renders headline', async () => {
    mount([item()]);
    expect(screen.getByText(/OrderDetailsPage/i)).toBeInTheDocument();
    await screen.findByText('Camiseta Shio');
  });

  it('avalia item entregue e passa a oferecer edição', async () => {
    mount([item()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));
    const modal = dialog('Avaliar produto');
    fireEvent.click(within(modal).getByRole('radio', { name: '5 estrelas' }));
    createReview.mockResolvedValueOnce(mine({ rating: 5, comment: '' }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Publicar avaliação' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(createReview).toHaveBeenCalledWith('p1', { rating: 5, comment: '', fit: '' });
    expect(screen.getByRole('button', { name: 'Editar avaliação' })).toBeInTheDocument();
    expect(getAllMyReviews).not.toHaveBeenCalled();
  });

  it('não oferece avaliação para item que não pode ser avaliado', async () => {
    mount([item({ can_review: false })]);
    await screen.findByText('Camiseta Shio');
    expect(screen.queryByRole('button', { name: 'Avaliar' })).not.toBeInTheDocument();
  });

  it('mostra avaliação removida com motivo e republica ao editar', async () => {
    getAllMyReviews.mockResolvedValueOnce([
      mine({ status: 'REMOVED', removal_reason_label: 'Spam ou propaganda' }),
    ]);
    mount([item({ review_id: 'r1' })]);
    expect(await screen.findByText('Removida pela loja: Spam ou propaganda')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Editar e republicar' }));
    const modal = dialog('Editar avaliação');
    expect(within(modal).getByRole('radio', { name: '2 estrelas' })).toHaveAttribute('aria-checked', 'true');
    expect(within(modal).getByLabelText(/Comentário/)).toHaveValue('Compre em x.com');
    fireEvent.change(within(modal).getByLabelText(/Comentário/), { target: { value: 'Tecido fino.' } });
    updateReview.mockResolvedValueOnce(mine({ comment: 'Tecido fino.' }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Salvar e republicar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(updateReview).toHaveBeenCalledWith('r1', { rating: 2, comment: 'Tecido fino.', fit: '' });
    expect(screen.queryByText(/Removida pela loja/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar avaliação' })).toBeInTheDocument();
  });

  it('não duplica a pontuação quando os detalhes da remoção terminam em ponto', async () => {
    getAllMyReviews.mockResolvedValueOnce([
      mine({ status: 'REMOVED', removal_reason_label: 'Outro', removal_note: 'Pode reenviar sem o link.' }),
    ]);
    mount([item({ review_id: 'r1' })]);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar e republicar' }));
    expect(within(dialog('Editar avaliação')).getByText(
      'Removida pela loja: Outro — Pode reenviar sem o link. Ao salvar, ela volta a ser publicada.',
    )).toBeInTheDocument();
  });

  it('atualiza todos os itens do mesmo produto depois de avaliar', async () => {
    mount([item(), item({ id: 'i2', sku_snapshot: 'CAM-G' })]);
    const [first] = await screen.findAllByRole('button', { name: 'Avaliar' });
    fireEvent.click(first);
    fireEvent.click(within(dialog('Avaliar produto')).getByRole('radio', { name: '4 estrelas' }));
    createReview.mockResolvedValueOnce(mine({ rating: 4 }));
    fireEvent.click(screen.getByRole('button', { name: 'Publicar avaliação' }));
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Editar avaliação' })).toHaveLength(2));
    expect(screen.queryByRole('button', { name: 'Avaliar' })).not.toBeInTheDocument();
  });

  it('continua permitindo editar quando minhas avaliações não carregam', async () => {
    getAllMyReviews.mockRejectedValueOnce(new Error('offline'));
    mount([item({ review_id: 'r1' })]);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar avaliação' }));
    const modal = dialog('Editar avaliação');
    expect(within(modal).getAllByRole('radio').every((radio) => radio.getAttribute('aria-checked') === 'false')).toBe(true);
    expect(within(modal).getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
    expect(within(modal).getByRole('note')).toHaveTextContent(WARNING);
  });

  it('recarrega o formulário quando a avaliação termina de carregar com o modal aberto', async () => {
    let resolveMine;
    getAllMyReviews.mockReturnValueOnce(new Promise((resolve) => { resolveMine = resolve; }));
    mount([item({ review_id: 'r1' })]);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar avaliação' }));
    expect(within(dialog('Editar avaliação')).getByRole('note')).toHaveTextContent(WARNING);
    resolveMine([mine({ rating: 2, comment: 'Compre em x.com' })]);
    await waitFor(() => expect(
      within(dialog('Editar avaliação')).getByRole('radio', { name: '2 estrelas' }),
    ).toHaveAttribute('aria-checked', 'true'));
    const modal = dialog('Editar avaliação');
    expect(within(modal).getByLabelText(/Comentário/)).toHaveValue('Compre em x.com');
    expect(within(modal).queryByRole('note')).not.toBeInTheDocument();
  });

  it('move o foco para o modal e fecha com Escape', async () => {
    mount([item()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));
    expect(document.activeElement).toBe(dialog('Avaliar produto'));
    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mostra o erro do backend e mantém o modal aberto', async () => {
    mount([item()]);
    fireEvent.click(await screen.findByRole('button', { name: 'Avaliar' }));
    fireEvent.click(screen.getByRole('radio', { name: '3 estrelas' }));
    createReview.mockRejectedValueOnce({
      response: { status: 403, data: { message: 'Você só pode avaliar produtos de pedidos entregues.' } },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publicar avaliação' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Você só pode avaliar produtos de pedidos entregues.');
    expect(dialog('Avaliar produto')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '3 estrelas' })).toHaveAttribute('aria-checked', 'true');
  });

  it('exclui a avaliação e volta a oferecer "Avaliar"', async () => {
    getAllMyReviews.mockResolvedValueOnce([mine()]);
    mount([item({ review_id: 'r1' })]);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar avaliação' }));
    fireEvent.click(screen.getByRole('button', { name: 'Excluir avaliação' }));
    deleteReview.mockResolvedValueOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(deleteReview).toHaveBeenCalledWith('r1');
    expect(screen.getByRole('button', { name: 'Avaliar' })).toBeInTheDocument();
  });
});
