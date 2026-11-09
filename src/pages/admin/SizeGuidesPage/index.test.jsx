import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SizeGuidesPage from './index';

const state = vi.hoisted(() => ({ guides: [], refetch: null }));

vi.mock('../../../hooks/useApi', () => ({
  useApi: (url) => ({
    data: url.includes('size-guides') ? state.guides : [
      { id: 'c1', name: 'Camisetas' },
      { id: 'c2', name: 'Calças' },
    ],
    loading: false,
    error: null,
    refetch: state.refetch,
  }),
}));
vi.mock('../../../lib/authToken', () => ({ getAccessToken: () => 'tok' }));

const topGuide = {
  id: 'g1',
  name: 'Parte de cima',
  columns: [{ key: 'chest', label: 'Tórax' }],
  rows: [
    { size: 'P', measures: { chest: [88, 94] } },
    { size: 'M', measures: { chest: [94, 100] } },
  ],
  categories: ['c1'],
  category_details: [{ id: 'c1', name: 'Camisetas', slug: 'camisetas' }],
};

const renderPage = () => render(<MemoryRouter><SizeGuidesPage /></MemoryRouter>);
const respond = (ok, body) => Promise.resolve({ ok, json: () => Promise.resolve(body) });
const drawer = () => within(screen.getByRole('dialog', { name: /guia/i }));

describe('SizeGuidesPage', () => {
  beforeEach(() => {
    state.guides = [topGuide];
    state.refetch = vi.fn();
    globalThis.fetch = vi.fn(() => respond(true, {}));
  });
  afterEach(() => vi.restoreAllMocks());

  it('lista os guias com tamanhos, faixas e categorias', () => {
    renderPage();
    const row = within(screen.getByRole('row', { name: /Parte de cima/ }));
    expect(row.getByText('P, M')).toBeInTheDocument();
    expect(row.getByText('Tórax: 88–100 cm')).toBeInTheDocument();
    expect(row.getByText('Camisetas')).toBeInTheDocument();
  });

  it('cria um guia montando a tabela sem JSON', async () => {
    state.guides = [];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '+ Novo guia' }));
    fireEvent.change(drawer().getByPlaceholderText('Ex: Parte de cima'), { target: { value: 'Calças' } });
    fireEvent.change(drawer().getByLabelText('Nova medida'), { target: { value: 'Cintura' } });
    fireEvent.click(drawer().getByRole('button', { name: 'Adicionar medida' }));
    fireEvent.click(drawer().getByRole('checkbox', { name: 'M' }));
    fireEvent.click(drawer().getByRole('checkbox', { name: 'P' }));
    fireEvent.change(drawer().getByLabelText('Cintura mín P'), { target: { value: '74' } });
    fireEvent.change(drawer().getByLabelText('Cintura máx P'), { target: { value: '80' } });
    fireEvent.change(drawer().getByLabelText('Cintura mín M'), { target: { value: '80' } });
    fireEvent.change(drawer().getByLabelText('Cintura máx M'), { target: { value: '86' } });
    fireEvent.click(drawer().getByRole('checkbox', { name: /Calças/ }));
    fireEvent.click(drawer().getByRole('button', { name: 'Salvar guia' }));

    await waitFor(() => expect(state.refetch).toHaveBeenCalled());
    const [url, options] = fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/catalog\/size-guides\/$/);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      name: 'Calças',
      columns: [{ key: 'cintura', label: 'Cintura' }],
      rows: [
        { size: 'P', measures: { cintura: [74, 80] } },
        { size: 'M', measures: { cintura: [80, 86] } },
      ],
      categories: ['c2'],
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('não chama a API com a tabela incompleta', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Ações' }));
    fireEvent.click(screen.getByText('Editar guia'));
    fireEvent.click(drawer().getByRole('checkbox', { name: 'G' }));
    fireEvent.click(drawer().getByRole('button', { name: 'Salvar guia' }));
    expect(drawer().getByRole('alert')).toHaveTextContent('Preencha mín e máx de Tórax no tamanho G.');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('edita com PUT e mostra o erro do backend', async () => {
    fetch.mockImplementation(() => respond(false, { error: 'Dados inválidos.', details: { name: ['Já existe um guia com este nome.'] } }));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Ações' }));
    fireEvent.click(screen.getByText('Editar guia'));
    expect(drawer().getByRole('checkbox', { name: /Camisetas/ })).toBeChecked();
    fireEvent.click(drawer().getByRole('button', { name: 'Salvar guia' }));
    expect(await drawer().findByRole('alert')).toHaveTextContent('Nome: Já existe um guia com este nome.');
    const [url, options] = fetch.mock.calls[0];
    expect(url).toMatch(/\/size-guides\/g1\/$/);
    expect(options.method).toBe('PUT');
  });

  it('avisa quando a categoria vai sair de outro guia', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: '+ Novo guia' }));
    expect(drawer().getByText('(usa “Parte de cima”)')).toBeInTheDocument();
    fireEvent.click(drawer().getByRole('checkbox', { name: /Camisetas/ }));
    expect(drawer().getByText('(sai de “Parte de cima”)')).toBeInTheDocument();
  });

  it('exclui depois de confirmar, avisando as categorias afetadas', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Ações' }));
    fireEvent.click(screen.getByText('Excluir'));
    expect(confirm.mock.calls[0][0]).toContain('Camisetas ficarão sem tabela de medidas');
    await waitFor(() => expect(state.refetch).toHaveBeenCalled());
    expect(fetch.mock.calls[0][1].method).toBe('DELETE');
  });
});
