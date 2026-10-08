import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ReviewSummary from './ReviewSummary';

const summary = (overrides = {}) => ({
  rating_avg: '4.50',
  rating_count: 4,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 2 },
  fit: { SMALL: 0, TRUE_TO_SIZE: 3, LARGE: 1 },
  ...overrides,
});

describe('ReviewSummary', () => {
  it('mostra média, total e distribuição por estrela', () => {
    render(<ReviewSummary summary={summary()} />);
    expect(screen.getByRole('img', { name: 'Nota 4,5 de 5' })).toBeInTheDocument();
    expect(screen.getByText('4 avaliações')).toBeInTheDocument();
    expect(screen.getByLabelText('5 estrelas: 2 avaliações')).toBeInTheDocument();
    expect(screen.getByLabelText('1 estrela: 0 avaliações')).toBeInTheDocument();
  });

  it('mostra o caimento quando há respostas', () => {
    render(<ReviewSummary summary={summary()} />);
    expect(screen.getByText('Caimento')).toBeInTheDocument();
    expect(screen.getByLabelText('Certo: 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Grande: 1')).toBeInTheDocument();
  });

  it('esconde o caimento sem respostas e usa singular', () => {
    render(<ReviewSummary summary={summary({ rating_count: 1, fit: { SMALL: 0, TRUE_TO_SIZE: 0, LARGE: 0 } })} />);
    expect(screen.getByText('1 avaliação')).toBeInTheDocument();
    expect(screen.queryByText('Caimento')).not.toBeInTheDocument();
  });
});
