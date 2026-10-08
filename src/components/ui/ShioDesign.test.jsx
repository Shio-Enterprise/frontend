import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter, useLocation } from 'react-router-dom';
import apiClient from '../../lib/axios';
import { NewsletterBand, ProductCard, Rating } from './ShioDesign';

function LocationProbe() { return <span data-testid="location">{useLocation().pathname}</span>; }

vi.mock('../../lib/axios', () => ({
  default: { post: vi.fn() },
}));

describe('ProductCard', () => {
  it('should not render a fake star rating', () => {
    const product = { id: '1', name: 'Camiseta', price: 'R$ 99,90', rating: null };
    render(
      <BrowserRouter>
        <ProductCard product={product} />
      </BrowserRouter>
    );
    expect(screen.queryByText('★★★★★')).not.toBeInTheDocument();
  });

  it('marks products with no positive variation stock as unavailable', () => {
    render(<BrowserRouter><ProductCard product={{ id: 'empty', name: 'Sem estoque', price: 'R$ 10,00', variations: [{ stock_quantity: 0 }] }} /></BrowserRouter>);
    expect(screen.getByText('Indisponível')).toBeInTheDocument();
  });

  it('sends anonymous users to login from the accessible favorite control', () => {
    render(<MemoryRouter initialEntries={['/category/all']}><ProductCard product={{ id: 'p1', name: 'Camiseta', price: 'R$ 10,00' }} /><LocationProbe /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /adicionar camiseta/i }));
    expect(screen.getByTestId('location')).toHaveTextContent('/login');
  });
});

const stars = (container, fill) => container.querySelectorAll(`[data-star="${fill}"]`).length;

describe('Rating', () => {
  it('4,3 mostra 4 estrelas cheias e 1 vazia', () => {
    const { container } = render(<Rating value="4.30" count={12} />);
    expect(screen.getByRole('img', { name: 'Nota 4,3 de 5' })).toBeInTheDocument();
    expect(screen.getByText('4,3 (12)')).toBeInTheDocument();
    expect([stars(container, 'full'), stars(container, 'half'), stars(container, 'empty')]).toEqual([4, 0, 1]);
  });

  it('4,5 mostra 4 cheias e meia', () => {
    const { container } = render(<Rating value={4.5} />);
    expect(screen.getByRole('img', { name: 'Nota 4,5 de 5' })).toBeInTheDocument();
    expect(screen.getByText('4,5')).toBeInTheDocument();
    expect([stars(container, 'full'), stars(container, 'half'), stars(container, 'empty')]).toEqual([4, 1, 0]);
  });

  it('valor ausente vira 0 e nota inteira mostra 5 cheias', () => {
    const empty = render(<Rating value={null} />);
    expect(stars(empty.container, 'empty')).toBe(5);
    empty.unmount();
    const { container } = render(<Rating value={5} />);
    expect(stars(container, 'full')).toBe(5);
  });

  it.each([
    [4.45, 'Nota 4,5 de 5', [4, 1, 0]],
    [4.25, 'Nota 4,3 de 5', [4, 0, 1]],
    [4.96, 'Nota 5,0 de 5', [5, 0, 0]],
    [7, 'Nota 5,0 de 5', [5, 0, 0]],
  ])('estrelas e texto concordam para %s', (value, name, expected) => {
    const { container } = render(<Rating value={value} />);
    expect(screen.getByRole('img', { name })).toBeInTheDocument();
    expect([stars(container, 'full'), stars(container, 'half'), stars(container, 'empty')]).toEqual(expected);
  });
});

describe('ProductCard rating', () => {
  const renderCard = (product) => render(
    <BrowserRouter>
      <ProductCard product={{ id: '1', name: 'Camiseta', price: 'R$ 99,90', ...product }} />
    </BrowserRouter>,
  );

  it('mostra a nota quando o produto tem avaliações', () => {
    renderCard({ ratingAvg: '4.50', ratingCount: 3 });
    expect(screen.getByRole('img', { name: 'Nota 4,5 de 5' })).toBeInTheDocument();
    expect(screen.getByText('4,5 (3)')).toBeInTheDocument();
  });

  it('não mostra estrelas sem avaliações', () => {
    renderCard({ ratingAvg: '0.00', ratingCount: 0 });
    expect(screen.queryByRole('img', { name: /^Nota/ })).not.toBeInTheDocument();
  });
});

describe('NewsletterBand', () => {
  it('should keep the submit button disabled until consent is checked', () => {
    render(<NewsletterBand />);
    const submit = screen.getByRole('button', { name: /inscrever-se/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Digite seu e-mail'), {
      target: { value: 'fan@shio.com' },
    });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(submit).not.toBeDisabled();
  });

  it('should call the real subscribe endpoint with consent', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { message: 'Inscrito com sucesso!' } });
    render(<NewsletterBand />);

    fireEvent.change(screen.getByPlaceholderText('Digite seu e-mail'), {
      target: { value: 'fan@shio.com' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /inscrever-se/i }));

    expect(apiClient.post).toHaveBeenCalledWith('/auth/newsletter/subscribe/', {
      email: 'fan@shio.com',
      consent_lgpd: true,
    });
    expect(await screen.findByText('Inscrito com sucesso!')).toBeInTheDocument();
  });
});
