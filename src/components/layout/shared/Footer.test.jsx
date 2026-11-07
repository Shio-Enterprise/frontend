import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Footer from './Footer';
import { axe } from 'vitest-axe';

describe('Footer', () => {
  it('should not link to terms or privacy pages', () => {
    render(
      <BrowserRouter>
        <Footer showNewsletter={false} />
      </BrowserRouter>
    );
    expect(screen.queryByText('Termos de uso')).not.toBeInTheDocument();
    expect(screen.queryByText('Política de privacidade')).not.toBeInTheDocument();
  });

  it('should show only the payment methods InfinitePay actually accepts', () => {
    render(
      <BrowserRouter>
        <Footer showNewsletter={false} />
      </BrowserRouter>
    );
    expect(screen.getByText('Pix')).toBeInTheDocument();
    expect(screen.getByText('Cartão')).toBeInTheDocument();
    expect(screen.getByText('Boleto')).toBeInTheDocument();
    expect(screen.queryByText('VISA')).not.toBeInTheDocument();
    expect(screen.queryByText('PayPal')).not.toBeInTheDocument();
  });

  it('títulos das colunas são h2 (não pulam nível em páginas só com h1)', () => {
    render(
      <BrowserRouter>
        <Footer showNewsletter={false} />
      </BrowserRouter>
    );
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0);
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0);
  });
});

// Testes mínimos da #64: vitest-axe sem violações, com e sem a faixa da newsletter.
describe('Footer — acessibilidade (axe)', () => {
  it.each([true, false])('sem violações (newsletter: %s)', async (showNewsletter) => {
    const { container } = render(<BrowserRouter><Footer showNewsletter={showNewsletter} /></BrowserRouter>);
    if (showNewsletter) expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
