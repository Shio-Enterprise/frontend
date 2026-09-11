import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter, createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Navbar from './Navbar';

describe('Navbar', () => {
  it.each(['desktop', 'mobile'])('envia search codificado pela busca %s', async (viewport) => {
    const router = createMemoryRouter(
      [{ path: '*', element: <Navbar /> }],
      { initialEntries: ['/category/camisetas?q=antiga'] },
    );
    render(<RouterProvider router={router} />);
    if (viewport === 'mobile') fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    const input = screen.getAllByRole('searchbox').at(-1);
    fireEvent.change(input, { target: { value: '  algodão & azul  ' } });
    fireEvent.submit(input.closest('form'));
    expect(router.state.location.pathname).toBe('/category/all');
    const params = new URLSearchParams(router.state.location.search);
    expect(params.get('search')).toBe('algodão & azul');
    expect(params.has('q')).toBe(false);
    expect(screen.getAllByRole('searchbox')).toHaveLength(1);
  });

  it('remove a busca ao enviar somente espaços', () => {
    const router = createMemoryRouter(
      [{ path: '*', element: <Navbar /> }],
      { initialEntries: ['/category/all?search=antiga'] },
    );
    render(<RouterProvider router={router} />);
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form'));
    expect(router.state.location.pathname).toBe('/category/all');
    expect(router.state.location.search).toBe('');
  });

  it('should render the logo and navigation links', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );

    const logos = screen.getAllByAltText('Shio Logo');
    expect(logos.length).toBeGreaterThan(0);

    const inicioLink = screen.getByRole('link', { name: 'Início' });
    expect(inicioLink).toHaveAttribute('href', '/');

    const produtosLink = screen.getByRole('link', { name: 'Produtos' });
    expect(produtosLink).toHaveAttribute('href', '/category/all');

    const contatoButton = screen.getByRole('button', { name: 'Contato' });
    expect(contatoButton).toBeInTheDocument();

    const cartLink = screen.getByTestId('cart-link');
    expect(cartLink).toBeInTheDocument();

    const myAccountLink = screen.getByTestId('my-account-link');
    expect(myAccountLink).toBeInTheDocument();
  });
});
