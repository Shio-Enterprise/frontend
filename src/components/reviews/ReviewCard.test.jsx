import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ReviewCard from './ReviewCard';

const review = (overrides = {}) => ({
  id: 'r1',
  rating: 4,
  comment: 'Tecido grosso, gostei.',
  fit: 'TRUE_TO_SIZE',
  author_name: 'Maria Silva',
  purchased_size: 'M',
  verified_purchase: true,
  admin_reply: '',
  admin_reply_at: null,
  created_at: '2026-09-20T12:00:00Z',
  updated_at: '2026-09-20T12:00:00Z',
  ...overrides,
});

describe('ReviewCard', () => {
  it('mostra nota, nome completo, selo, tamanho, caimento, data e comentário', () => {
    render(<ReviewCard review={review()} />);
    expect(screen.getByRole('img', { name: 'Nota 4,0 de 5' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Maria Silva' })).toBeInTheDocument();
    expect(screen.getByText('Compra verificada')).toBeInTheDocument();
    expect(screen.getByText('Comprou: M · Caimento: Certo')).toBeInTheDocument();
    expect(screen.getByText(/20 de set\.? de 2026/)).toBeInTheDocument();
    expect(screen.getByText('Tecido grosso, gostei.')).toBeInTheDocument();
    expect(screen.queryByText('Resposta da Shio')).not.toBeInTheDocument();
  });

  it('mostra a resposta da Shio e omite detalhes vazios', () => {
    render(<ReviewCard review={review({ purchased_size: '', fit: '', comment: '', admin_reply: 'Obrigado!' })} />);
    expect(screen.getByText('Resposta da Shio')).toBeInTheDocument();
    expect(screen.getByText('Obrigado!')).toBeInTheDocument();
    expect(screen.queryByText(/Comprou:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Caimento:/)).not.toBeInTheDocument();
  });
});
