import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import CouponsPage from './index';

const state = vi.hoisted(() => ({ coupons: null, drops: null, categories: null }));

vi.mock('../../../hooks/useApi', () => ({
  useApi: (url) => ({
    data: url.includes('admin/coupons') ? state.coupons
      : url.includes('catalog/drops') ? state.drops
      : url.includes('catalog/categories') ? state.categories
      : null,
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../../../lib/authToken', () => ({ getAccessToken: () => 'tok' }));
vi.mock('../../../components/admin/CouponEmailModal', () => ({
  default: ({ coupon }) => <div>modal-email {coupon.code}</div>,
}));

const base = { id: 1, code: 'VERAO20', is_active: true, discount_type: 'PERCENTAGE', discount_value: '10', uses_count: 0, max_uses_total: null, expiration_date: null };

function renderPage() {
  render(<MemoryRouter><CouponsPage /></MemoryRouter>);
}

describe('CouponsPage', () => {
  beforeEach(() => {
    state.coupons = [];
    state.drops = null;
    state.categories = null;
    vi.stubEnv('VITE_API_URL', 'http://api');
  });

  it('renders headline', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Cupons de Desconto' })).toBeInTheDocument();
  });

  async function saveForm(coupons = []) {
    state.coupons = coupons;
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ...base, id: 9, code: 'NOVO' }) }));
    renderPage();
  }

  it('após criar cupom pergunta se quer enviar', async () => {
    await saveForm();
    fireEvent.click(screen.getByRole('button', { name: '+ Novo Cupom' }));
    fireEvent.change(screen.getByPlaceholderText('Ex: VERAO20'), { target: { value: 'novo' } });
    fireEvent.change(document.querySelector('input[type=number][step="0.01"]'), { target: { value: '10' } });
    fireEvent.submit(document.getElementById('coupon-form'));
    expect(await screen.findByText('Cupom NOVO criado. Quer enviar este cupom por e-mail para os clientes agora?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agora não' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Enviar por e-mail' }));
    expect(screen.getByText('modal-email NOVO')).toBeInTheDocument();
  });

  it('editar cupom não pergunta', async () => {
    await saveForm([base]);
    fireEvent.click(screen.getByRole('button', { name: /^Ações para o cupom/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Editar Cupom' }));
    fireEvent.submit(document.getElementById('coupon-form'));
    await waitFor(() => expect(document.getElementById('coupon-form')).toBeNull());
    expect(screen.queryByText(/Quer enviar este cupom/)).not.toBeInTheDocument();
  });

  it('menu Ações tem Enviar por e-mail desabilitado para cupom inativo', () => {
    state.coupons = [{ ...base, is_active: false }];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^Ações para o cupom/ }));
    expect(screen.getByRole('menuitem', { name: 'Enviar por e-mail' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('desabilita para cupom esgotado ou vencido e habilita para válido', () => {
    state.coupons = [{ ...base, max_uses_total: 5, uses_count: 5 }];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^Ações para o cupom/ }));
    expect(screen.getByRole('menuitem', { name: 'Enviar por e-mail' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('habilita para cupom válido e abre o modal', () => {
    state.coupons = [base];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^Ações para o cupom/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Enviar por e-mail' }));
    expect(screen.getByText('modal-email VERAO20')).toBeInTheDocument();
  });

  it('selo mostra Vencido, Esgotado, Inativo ou Ativo', () => {
    state.coupons = [
      { ...base, id: 1, code: 'VALIDO' },
      { ...base, id: 2, code: 'VENCIDO', expiration_date: '2020-01-01T00:00:00Z' },
      { ...base, id: 3, code: 'ESGOTADO', max_uses_total: 5, uses_count: 5, remaining_uses: 0 },
      { ...base, id: 4, code: 'DESLIGADO', is_active: false, expiration_date: '2020-01-01T00:00:00Z' },
    ];
    renderPage();
    const badgeOf = (code) => screen.getByText(code).closest('tr').querySelector('[data-testid="coupon-status"]').textContent;
    expect(badgeOf('VALIDO')).toBe('Ativo');
    expect(badgeOf('VENCIDO')).toBe('Vencido');
    expect(badgeOf('ESGOTADO')).toBe('Esgotado');
    expect(badgeOf('DESLIGADO')).toBe('Inativo');
  });

  it('vencido e esgotado ao mesmo tempo mostra Vencido', () => {
    state.coupons = [{ ...base, expiration_date: '2020-01-01T00:00:00Z', max_uses_total: 1, uses_count: 1 }];
    renderPage();
    expect(screen.getByTestId('coupon-status').textContent).toBe('Vencido');
  });

  function openEdit(coupon) {
    state.coupons = [coupon];
    globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(coupon) }));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^Ações para o cupom/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Editar Cupom' }));
  }

  const sentBody = () => JSON.parse(globalThis.fetch.mock.calls.at(-1)[1].body);

  it('apagar limites ao editar envia null e volta a ser ilimitado', async () => {
    openEdit({ ...base, max_uses_total: 10, max_uses_per_user: 2, min_order_value: '50.00', max_discount_amount: '30.00' });
    fireEvent.change(screen.getByPlaceholderText('Ilimitado'), { target: { value: '' } });
    fireEvent.change(screen.getByPlaceholderText('Normal: 1'), { target: { value: '' } });
    fireEvent.change(screen.getByPlaceholderText('Aplicado ao subtotal'), { target: { value: '' } });
    fireEvent.change(screen.getByPlaceholderText('Valor máximo descontado'), { target: { value: '' } });
    fireEvent.submit(document.getElementById('coupon-form'));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(sentBody()).toMatchObject({ max_uses_total: null, max_uses_per_user: null, min_order_value: null, max_discount_amount: null });
  });

  it('apagar datas ao editar envia null', async () => {
    openEdit({ ...base, starts_at: '2030-01-01T10:00:00Z', expiration_date: '2030-02-01T10:00:00Z' });
    document.querySelectorAll('input[type="datetime-local"]').forEach((el) => fireEvent.change(el, { target: { value: '' } }));
    fireEvent.submit(document.getElementById('coupon-form'));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(sentBody()).toMatchObject({ starts_at: null, expiration_date: null });
  });

  it('manter limite preenchido envia o número', async () => {
    openEdit({ ...base, max_uses_total: 10 });
    fireEvent.submit(document.getElementById('coupon-form'));
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(sentBody().max_uses_total).toBe(10);
  });

  it('editar cupom antigo com limite 0 mostra 0 no campo', () => {
    openEdit({ ...base, max_uses_total: 0 });
    expect(screen.getByPlaceholderText('Ilimitado')).toHaveValue(0);
  });

  it('campos de limite exigem no mínimo 1', () => {
    openEdit(base);
    expect(screen.getByPlaceholderText('Ilimitado')).toHaveAttribute('min', '1');
    expect(screen.getByPlaceholderText('Normal: 1')).toHaveAttribute('min', '1');
  });

  it('erro de validação do backend aparece legível', async () => {
    openEdit(base);
    globalThis.fetch = vi.fn(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ max_uses_total: ['Certifique-se que este valor seja maior ou igual a 1.'] }),
    }));
    fireEvent.submit(document.getElementById('coupon-form'));
    expect(await screen.findByText('Usos Totais: Certifique-se que este valor seja maior ou igual a 1.')).toBeInTheDocument();
    expect(screen.queryByText(/\{"max_uses_total"/)).not.toBeInTheDocument();
  });

  it('limite de usos 0 não aparece como Ilimitado', () => {
    state.coupons = [{ ...base, max_uses_total: 0, uses_count: 0, remaining_uses: 0 }];
    renderPage();
    expect(screen.getByText('0 restantes')).toBeInTheDocument();
    expect(screen.queryByText('Ilimitado')).not.toBeInTheDocument();
  });

  describe('drops e categorias do cupom (#101)', () => {
    const drops = [{ id: 'd1', name: 'Drop Verão' }, { id: 'd2', name: 'Drop Inverno' }];
    const categories = [{ id: 'c1', name: 'Camisetas' }, { id: 'c2', name: 'Bonés' }];

    beforeEach(() => {
      state.drops = drops;
      state.categories = categories;
    });

    function openEdit(coupon) {
      state.coupons = [coupon];
      globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(coupon) }));
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: /^Ações para o cupom/ }));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Editar Cupom' }));
      return screen.getByRole('dialog');
    }

    const sentBody = () => JSON.parse(globalThis.fetch.mock.calls[0][1].body);

    it('um clique marca e outro desmarca, sem Ctrl', () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: '+ Novo Cupom' }));
      const group = screen.getByRole('group', { name: 'Drops Válidos (opcional)' });
      const verao = within(group).getByRole('checkbox', { name: 'Drop Verão' });
      fireEvent.click(verao);
      expect(verao).toBeChecked();
      fireEvent.click(verao);
      expect(verao).not.toBeChecked();
    });

    it('editar, desmarcar um drop e salvar envia a lista sem ele', async () => {
      const dialog = openEdit({ ...base, drops: ['d1', 'd2'], categories: [] });
      const group = within(dialog).getByRole('group', { name: 'Drops Válidos (opcional)' });
      expect(within(group).getByRole('checkbox', { name: 'Drop Verão' })).toBeChecked();
      fireEvent.click(within(group).getByRole('checkbox', { name: 'Drop Verão' }));
      fireEvent.submit(document.getElementById('coupon-form'));
      await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
      expect(sentBody().drops).toEqual(['d2']);
    });

    it('"Limpar" desmarca tudo e o cupom volta a valer para todos', async () => {
      const dialog = openEdit({ ...base, drops: ['d1'], categories: ['c1', 'c2'] });
      const categoriesGroup = within(dialog).getByRole('group', { name: 'Categorias Válidas (opcional)' });
      fireEvent.click(within(categoriesGroup).getByRole('button', { name: 'Limpar categorias' }));
      expect(within(categoriesGroup).getByRole('checkbox', { name: 'Camisetas' })).not.toBeChecked();
      expect(within(categoriesGroup).getByRole('checkbox', { name: 'Bonés' })).not.toBeChecked();
      expect(categoriesGroup).toHaveTextContent('Nenhuma marcada: vale para todas as categorias.');
      // O botão some: o foco vai para a primeira opção do grupo.
      expect(document.activeElement).toBe(within(categoriesGroup).getByRole('checkbox', { name: 'Camisetas' }));

      const dropsGroup = within(dialog).getByRole('group', { name: 'Drops Válidos (opcional)' });
      fireEvent.click(within(dropsGroup).getByRole('checkbox', { name: 'Drop Verão' }));
      expect(dropsGroup).toHaveTextContent('Nenhum marcado: vale para todos os drops.');
      expect(within(dropsGroup).queryByRole('button', { name: 'Limpar drops' })).not.toBeInTheDocument();

      fireEvent.submit(document.getElementById('coupon-form'));
      await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
      expect(sentBody().drops).toEqual([]);
      expect(sentBody().categories).toEqual([]);
    });

    it('mostra quantos estão marcados', () => {
      const dialog = openEdit({ ...base, drops: ['d1'], categories: [] });
      expect(within(dialog).getByRole('group', { name: 'Drops Válidos (opcional)' })).toHaveTextContent('1 marcado');
    });

    it('categoria também marca e desmarca com um clique', () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: '+ Novo Cupom' }));
      const group = screen.getByRole('group', { name: 'Categorias Válidas (opcional)' });
      const bones = within(group).getByRole('checkbox', { name: 'Bonés' });
      fireEvent.click(bones);
      expect(bones).toBeChecked();
      expect(group).toHaveTextContent('1 marcada');
      fireEvent.click(bones);
      expect(bones).not.toBeChecked();
      expect(group).toHaveTextContent('Nenhuma marcada: vale para todas as categorias.');
    });

    it('ID numérico da API e ID da lista batem, e o salvo mantém o tipo', async () => {
      state.categories = [{ id: 3, name: 'Camisetas' }, { id: 4, name: 'Bonés' }];
      const dialog = openEdit({ ...base, drops: [], categories: [3, 4] });
      const group = within(dialog).getByRole('group', { name: 'Categorias Válidas (opcional)' });
      expect(within(group).getByRole('checkbox', { name: 'Camisetas' })).toBeChecked();
      fireEvent.click(within(group).getByRole('checkbox', { name: 'Camisetas' }));
      fireEvent.submit(document.getElementById('coupon-form'));
      await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
      expect(sentBody().categories).toEqual([4]);
    });

    it('marcar várias e salvar envia todas', async () => {
      const dialog = openEdit({ ...base, drops: [], categories: [] });
      const group = within(dialog).getByRole('group', { name: 'Drops Válidos (opcional)' });
      fireEvent.click(within(group).getByRole('checkbox', { name: 'Drop Verão' }));
      fireEvent.click(within(group).getByRole('checkbox', { name: 'Drop Inverno' }));
      expect(group).toHaveTextContent('2 marcados');
      fireEvent.submit(document.getElementById('coupon-form'));
      await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
      expect(sentBody().drops).toEqual(['d1', 'd2']);
    });

    it('sem drops cadastrados mostra um aviso em vez de uma caixa vazia', () => {
      state.drops = [];
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: '+ Novo Cupom' }));
      const group = screen.getByRole('group', { name: 'Drops Válidos (opcional)' });
      expect(within(group).queryByRole('list')).not.toBeInTheDocument();
      expect(group).toHaveTextContent('Nenhum drop cadastrado.');
    });

    it('as opções são caixas de marcar nativas, na ordem do Tab', () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: '+ Novo Cupom' }));
      const boxes = within(screen.getByRole('group', { name: 'Drops Válidos (opcional)' })).getAllByRole('checkbox');
      // input type=checkbox nativo: Espaço marca/desmarca sem código extra; nenhum tabindex negativo.
      for (const box of boxes) {
        expect(box.tagName).toBe('INPUT');
        expect(box).toHaveAttribute('type', 'checkbox');
        expect(box).not.toHaveAttribute('tabindex');
      }
    });

    it('as caixas de marcar não têm violações de acessibilidade', async () => {
      const { container } = render(<MemoryRouter><CouponsPage /></MemoryRouter>);
      fireEvent.click(screen.getByRole('button', { name: '+ Novo Cupom' }));
      fireEvent.click(screen.getByRole('checkbox', { name: 'Drop Verão' }));
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('acessibilidade (#64)', () => {
    it('cupom novo abre como modal com campos rotulados e fecha com Esc', async () => {
      renderPage();
      const opener = screen.getByRole('button', { name: '+ Novo Cupom' });
      opener.focus();
      fireEvent.click(opener);
      const dialog = screen.getByRole('dialog', { name: 'Novo Cupom' });
      for (const name of ['Código', 'Descrição', 'Tipo de Desconto', 'Valor', 'Início', 'Fim', 'Usos Totais', 'Usos por Usuário', 'Parceiro (Méliuz, Influenciador)']) {
        expect(within(dialog).getByLabelText(name)).toBeInTheDocument();
      }
      expect(within(dialog).getByRole('group', { name: 'Drops Válidos (opcional)' })).toBeInTheDocument();
      expect(within(dialog).getByRole('group', { name: 'Categorias Válidas (opcional)' })).toBeInTheDocument();
      fireEvent.keyDown(dialog, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.activeElement).toBe(opener);
    });

    it('apagar pede confirmação num modal (sem window.confirm) e anuncia o resultado', async () => {
      state.coupons = [base];
      const confirmSpy = vi.spyOn(window, 'confirm');
      globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) }));
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Ações para o cupom VERAO20' }));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Deletar' }));
      expect(confirmSpy).not.toHaveBeenCalled();
      const dialog = screen.getByRole('dialog', { name: 'Apagar o cupom VERAO20?' });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Apagar' }));
      await waitFor(() => expect(document.activeElement).toHaveTextContent('Cupom VERAO20 apagado.'));
      expect(globalThis.fetch.mock.calls[0][1].method).toBe('DELETE');
    });

    it('cupom com usos avisa que será desativado', () => {
      state.coupons = [{ ...base, uses_count: 3 }];
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Ações para o cupom VERAO20' }));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Deletar' }));
      expect(screen.getByRole('dialog', { name: 'Desativar o cupom VERAO20?' })).toHaveTextContent('será desativado em vez de apagado');
    });

    it('falha ao desativar aparece como alerta', async () => {
      state.coupons = [base];
      globalThis.fetch = vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) }));
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Ações para o cupom VERAO20' }));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Desativar' }));
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Desativar' }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir a ação no cupom.');
    });

    it('tabela rola por dentro pelo teclado e a página não tem violações', async () => {
      state.coupons = [base];
      const { container } = render(<MemoryRouter><CouponsPage /></MemoryRouter>);
      expect(screen.getByRole('region', { name: 'Tabela de cupons' })).toHaveAttribute('tabindex', '0');
      expect(await axe(container)).toHaveNoViolations();
    });

    it('modal do cupom não tem violações', async () => {
      const { container } = render(<MemoryRouter><CouponsPage /></MemoryRouter>);
      fireEvent.click(screen.getByRole('button', { name: '+ Novo Cupom' }));
      expect(await axe(container)).toHaveNoViolations();
    });
  });
});
