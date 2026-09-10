import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import apiClient from '../../lib/axios';
import { NewsletterBand, ProductCard } from './ShioDesign';

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
