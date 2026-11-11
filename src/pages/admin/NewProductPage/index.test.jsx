import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import NewProductPage from './index';

vi.mock('../../../hooks/useApi', () => ({
  useApi: (url) => ({
    data: url.includes('/categories/')
      ? [{ id: 'cat-1', name: 'Camisetas' }]
      : url.includes('/size-guides/')
        ? [{ id: 'guia-1', name: 'Camiseta oversized' }]
        : null,
    loading: false, error: null, refetch: vi.fn(),
  }),
}));

describe('NewProductPage', () => {
  it('renders headline', () => {
    render(<MemoryRouter><NewProductPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});

vi.mock('../../../lib/authToken', () => ({ getAccessToken: () => 'test-token' }));

it('submits cost, promotion and explicit variations without losing a manual SKU', async () => {
  const { fireEvent, waitFor } = await import('@testing-library/react');
  const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ sku: ['SKU já cadastrado.'] }) });
  vi.stubGlobal('fetch', fetchMock);
  render(<MemoryRouter><NewProductPage /></MemoryRouter>);
  fireEvent.change(screen.getByPlaceholderText('Ex: Moletom'), { target: { value: 'Camisa' } });
  fireEvent.change(screen.getByLabelText('Custo unitário'), { target: { value: '60' } });
  fireEvent.change(screen.getByLabelText('SKU 1'), { target: { value: 'manual-sku' } });
  fireEvent.change(screen.getByLabelText('Cor 1'), { target: { value: '#FF0000' } });
  fireEvent.change(screen.getByLabelText('Tamanho 1'), { target: { value: 'M' } });
  fireEvent.submit(screen.getByPlaceholderText('Ex: Moletom').closest('form'));
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(payload.cost_price).toBe('60');
  expect(payload.variations).toEqual([{ size: 'M', color: '#FF0000', sku: 'MANUAL-SKU', stock_quantity: 0 }]);
  expect(payload.category).toBeNull();
  await screen.findByText(/SKU já cadastrado/);
  expect(screen.getByLabelText('SKU 1')).toHaveValue('MANUAL-SKU');
  expect(screen.getByLabelText('Cor 1')).toHaveValue('#FF0000');
  vi.unstubAllGlobals();
});

it('envia a categoria escolhida no cadastro', async () => {
  const { fireEvent, waitFor } = await import('@testing-library/react');
  const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
  vi.stubGlobal('fetch', fetchMock);
  render(<MemoryRouter><NewProductPage /></MemoryRouter>);
  fireEvent.change(screen.getByPlaceholderText('Ex: Moletom'), { target: { value: 'Camisa' } });
  fireEvent.change(screen.getByLabelText('Custo unitário'), { target: { value: '60' } });
  const categoria = screen.getByRole('combobox', { name: /Categoria/ });
  expect(categoria).toHaveAccessibleDescription('Organiza o produto na loja.');
  fireEvent.change(categoria, { target: { value: 'cat-1' } });
  fireEvent.submit(screen.getByPlaceholderText('Ex: Moletom').closest('form'));
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(payload.category).toBe('cat-1');
  // Sem guia escolhido, o produto usa o da categoria.
  expect(payload.size_guide).toBeNull();
  vi.unstubAllGlobals();
});

it('envia o guia de medidas escolhido no cadastro', async () => {
  const { fireEvent, waitFor } = await import('@testing-library/react');
  const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
  vi.stubGlobal('fetch', fetchMock);
  render(<MemoryRouter><NewProductPage /></MemoryRouter>);
  fireEvent.change(screen.getByPlaceholderText('Ex: Moletom'), { target: { value: 'Camisa' } });
  fireEvent.change(screen.getByLabelText('Custo unitário'), { target: { value: '60' } });
  const guia = screen.getByRole('combobox', { name: /Guia de medidas/ });
  expect(guia).toHaveValue('');
  fireEvent.change(guia, { target: { value: 'guia-1' } });
  fireEvent.submit(screen.getByPlaceholderText('Ex: Moletom').closest('form'));
  await waitFor(() => expect(fetchMock).toHaveBeenCalled());
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).size_guide).toBe('guia-1');
  vi.unstubAllGlobals();
});

describe('NewProductPage — imagens e acessibilidade (#64)', () => {
  it('cada imagem tem botão "Remover" com número; remover devolve o foco ao botão de adicionar', async () => {
    const { fireEvent, waitFor } = await import('@testing-library/react');
    let n = 0;
    globalThis.URL.createObjectURL = vi.fn(() => `blob:img${n++}`);
    globalThis.URL.revokeObjectURL = vi.fn();
    const { container } = render(<MemoryRouter><NewProductPage /></MemoryRouter>);
    const files = [new File(['a'], 'frente.png', { type: 'image/png' }), new File(['b'], 'costas.png', { type: 'image/png' })];
    fireEvent.change(container.querySelector('input[type=file]'), { target: { files } });

    expect(screen.getByRole('img', { name: 'Imagem 2: costas.png' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remover imagem 1' }));

    expect(screen.queryByRole('img', { name: 'Imagem 1: frente.png' })).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Imagem 1: costas.png' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Adicionar imagens' })).toHaveFocus());
  });

  it('formulário sem violações de acessibilidade', async () => {
    const { axe } = await import('vitest-axe');
    const { container } = render(<MemoryRouter><NewProductPage /></MemoryRouter>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
