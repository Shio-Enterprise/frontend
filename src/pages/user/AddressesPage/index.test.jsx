import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AddressesPage from './index';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, logout: async () => {} }),
}));

describe('AddressesPage', () => {
  it('renders headline', async () => {
    render(
      <BrowserRouter>
        <AddressesPage />
      </BrowserRouter>
    );
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
