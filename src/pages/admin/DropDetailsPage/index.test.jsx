import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { axe } from 'vitest-axe';
import DropDetailsPage from './index';

const camiseta = { id: 'p1', name: 'Camiseta', base_price: '99.90', variations: [{ stock_quantity: 2 }] };
const bone = { id: 'p2', name: 'Boné', base_price: '59.90', variations: [] };

vi.mock('../../../lib/authToken', () => ({ getAccessToken: () => 'token' }));

vi.mock('../../../hooks/useApi', () => ({
  useApi: (url) => {
    if (typeof url === 'string' && url.includes('/products/') && !url.match(/\/drops\//)) {
      return { data: [camiseta, bone], loading: false, error: null, refetch: vi.fn() };
    }
    return {
      data: {
        id: '1',
        name: 'Drop Teste',
        slug: 'drop-teste',
        description: 'Descrição do drop',
        launch_date: '2024-06-01T00:00:00Z',
        is_active: true,
        products: [camiseta],
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    };
  },
}));

const renderPage = () => render(
  <MemoryRouter initialEntries={['/admin/drops/1']}>
    <Routes>
      <Route path="/admin/drops/:id" element={<DropDetailsPage />} />
      <Route path="/admin/drops" element={<p>lista de drops</p>} />
    </Routes>
  </MemoryRouter>
);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('DropDetailsPage', () => {
  it('renders headline', async () => {
    renderPage();
    // Layouts de celular e desktop ficam no DOM (um escondido por CSS, que o jsdom não aplica).
    expect((await screen.findAllByRole('heading', { level: 1 }))[0]).toBeInTheDocument();
  });

  it('link de voltar do celular tem nome', () => {
    renderPage();
    expect(screen.getByRole('link', { name: 'Voltar para drops' })).toHaveAttribute('href', '/admin/drops');
  });

  it('excluir abre um diálogo em vez do confirm do navegador', async () => {
    const confirmSpy = vi.fn();
    vi.stubGlobal('confirm', confirmSpy);
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true })));
    renderPage();
    const [openButton] = screen.getAllByRole('button', { name: /excluir drop/i });
    fireEvent.click(openButton);

    const dialog = screen.getByRole('dialog', { name: 'Excluir drop' });
    expect(dialog).toHaveAccessibleDescription(/ficarão sem drop/);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    expect(await screen.findByText('lista de drops')).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('Gerenciar anuncia aberto/fechado e os botões dizem qual produto', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: async () => ({ id: '1', name: 'Drop Teste', products: [camiseta, bone] }) })));
    renderPage();
    const [toggle] = screen.getAllByRole('button', { name: 'Gerenciar' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    expect(screen.getAllByRole('button', { name: 'Remover Camiseta do drop' }).length).toBeGreaterThan(0);
    const [add] = screen.getAllByRole('button', { name: 'Adicionar Boné ao drop' });
    fireEvent.click(add);

    expect(await screen.findByText('Boné adicionado ao drop.')).toHaveAttribute('role', 'status');
  });

  it('sem violações de acessibilidade', async () => {
    const { container } = renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: 'Gerenciar' })[0]);
    expect(await axe(container)).toHaveNoViolations();
  });
});
