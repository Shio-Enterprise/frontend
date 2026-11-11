import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Footer from './Footer';
import { axe } from 'vitest-axe';
import { socialLinks } from '../../../data/institutionalContent';

afterEach(() => { socialLinks.length = 0; });

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

  it('shows the payment methods offered in checkout', () => {
    render(
      <BrowserRouter>
        <Footer showNewsletter={false} />
      </BrowserRouter>
    );
    expect(screen.getByText('Pix')).toBeInTheDocument();
    expect(screen.getByText('Cartão')).toBeInTheDocument();
    expect(screen.queryByText('Boleto')).not.toBeInTheDocument();
    expect(screen.queryByText('VISA')).not.toBeInTheDocument();
    expect(screen.queryByText('PayPal')).not.toBeInTheDocument();
  });

  it('links each institutional page to its own route and preserves account links', () => {
    render(<BrowserRouter><Footer showNewsletter={false} /></BrowserRouter>);
    const destinations = {
      'Sobre nós': '/sobre-nos',
      'Nossa história': '/nossa-historia',
      'Contato': '/contato',
      'Suporte ao cliente': '/ajuda/suporte',
      'Prazo de entrega': '/ajuda/prazo-de-entrega',
      'Trocas e devoluções': '/ajuda/trocas-e-devolucoes',
      'Drops': '/category/all',
      'Meus dados': '/my-account',
      'Meus pedidos': '/my-orders',
      'Endereços': '/addresses',
      'Cadastre-se': '/signup',
    };
    for (const [label, destination] of Object.entries(destinations)) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', destination);
    }
    expect(screen.getAllByRole('link').every((link) => link.getAttribute('href') !== '/')).toBe(true);
    expect(screen.queryByRole('heading', { name: 'Redes sociais' })).not.toBeInTheDocument();
  });

  it('opens configured social destinations in a new tab', () => {
    socialLinks.push(
      { label: 'Instagram', href: 'https://www.instagram.com/example' },
      { label: 'WhatsApp', href: 'https://wa.me/5500000000000' },
      { label: 'TikTok', href: 'https://www.tiktok.com/@example' },
    );
    render(<BrowserRouter><Footer showNewsletter={false} /></BrowserRouter>);
    for (const social of socialLinks) {
      const link = screen.getByRole('link', { name: `${social.label} (abre em nova aba)` });
      expect(link).toHaveAttribute('href', social.href);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
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
