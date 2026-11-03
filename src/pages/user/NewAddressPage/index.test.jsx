import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import NewAddressPage from './index';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, logout: async () => {} }),
}));

describe('NewAddressPage', () => {
  it('renders headline', () => {
    render(
      <BrowserRouter>
        <NewAddressPage />
      </BrowserRouter>
    );
    const headline = screen.getByText(/NewAddressPage/i);
    expect(headline).toBeInTheDocument();
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
