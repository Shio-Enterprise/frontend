import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import MyOrdersPage from './index';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, logout: async () => {} }),
}));

describe('MyOrdersPage', () => {
  it('renders headline', () => {
    render(
      <BrowserRouter>
        <MyOrdersPage />
      </BrowserRouter>
    );
    const headline = screen.getByText(/MyOrdersPage/i);
    expect(headline).toBeInTheDocument();
  });
});
