import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter }from 'react-router-dom';
import OrderDetailsPage from './index';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, logout: async () => {} }),
}));

describe('OrderDetailsPage', () => {
  it('renders headline', () => {
    render(
      <BrowserRouter>
        <OrderDetailsPage />
      </BrowserRouter>
    );
    const headline = screen.getByText(/OrderDetailsPage/i);
    expect(headline).toBeInTheDocument();
  });
});
