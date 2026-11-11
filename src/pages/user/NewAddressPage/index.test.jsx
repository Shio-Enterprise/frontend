import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import NewAddressPage from './index';
import { axe } from 'vitest-axe';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, logout: async () => {} }),
}));

describe('NewAddressPage', () => {
  it('renders headline', async () => {
    render(
      <BrowserRouter>
        <NewAddressPage />
      </BrowserRouter>
    );
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});

describe('NewAddressPage — acessibilidade do formulário', () => {
  const renderPage = () =>
    render(
      <BrowserRouter>
        <NewAddressPage />
      </BrowserRouter>
    );

  it('campos de endereço com autocomplete e CEP com teclado numérico', () => {
    renderPage();
    const cep = screen.getByLabelText('CEP');
    expect(cep).toHaveAttribute('autocomplete', 'postal-code');
    expect(cep).toHaveAttribute('inputmode', 'numeric');
    expect(screen.getByLabelText('Rua / Logradouro')).toHaveAttribute('autocomplete', 'address-line1');
    expect(screen.getByLabelText(/Complemento/)).toHaveAttribute('autocomplete', 'address-line2');
    expect(screen.getByLabelText('Cidade')).toHaveAttribute('autocomplete', 'address-level2');
    expect(screen.getByLabelText('UF')).toHaveAttribute('autocomplete', 'address-level1');
  });

  it('CEP não encontrado: erro anunciado e ligado ao campo', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ json: async () => ({ erro: true }) });
    renderPage();
    const cep = screen.getByLabelText('CEP');
    fireEvent.change(cep, { target: { value: '00000000' } });
    fireEvent.click(within(cep.closest('form')).getByRole('button', { name: 'Buscar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('CEP não encontrado.');
    expect(cep).toHaveAttribute('aria-invalid', 'true');
    expect(cep).toHaveAccessibleDescription('CEP não encontrado.');
    fetchMock.mockRestore();
  });
});

// Testes mínimos da #64: formulário de endereço sem violações, vazio e com CEP não encontrado.
describe('NewAddressPage — acessibilidade (axe)', () => {
  it('sem violações vazio e com erro de CEP ligado ao campo', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ json: async () => ({ erro: true }) });
    const { container } = render(<BrowserRouter><NewAddressPage /></BrowserRouter>);
    expect(await axe(container)).toHaveNoViolations();
    const cep = screen.getByLabelText('CEP');
    fireEvent.change(cep, { target: { value: '00000000' } });
    fireEvent.click(within(cep.closest('form')).getByRole('button', { name: 'Buscar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('CEP não encontrado.');
    expect(await axe(container)).toHaveNoViolations();
    vi.restoreAllMocks();
  });
});
