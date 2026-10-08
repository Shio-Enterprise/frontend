import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CouponsPage from './index';

vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({ data: null, loading: false, error: null, refetch: vi.fn() }),
}));

describe('CouponsPage', () => {
  it('renders headline', () => {
    render(<MemoryRouter><CouponsPage /></MemoryRouter>);
    expect(screen.getByText(/Cupons de Desconto/i)).toBeInTheDocument();
  });
});
