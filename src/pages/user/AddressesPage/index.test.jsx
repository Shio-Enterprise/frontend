import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AddressesPage from './index';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, logout: async () => {} }),
}));

describe('AddressesPage', () => {
  it('renders headline', () => {
    render(
      <BrowserRouter>
        <AddressesPage />
      </BrowserRouter>
    );
    const headline = screen.getByText(/AddressesPage/i);
    expect(headline).toBeInTheDocument();
  });
});
