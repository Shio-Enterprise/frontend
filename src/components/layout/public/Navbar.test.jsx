import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from './Navbar';

describe('Navbar', () => {
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

  it('should show the correct welcome discount in the banner', () => {
    render(
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    );
    expect(screen.getByText(/10% de desconto/i)).toBeInTheDocument();
  });
});
