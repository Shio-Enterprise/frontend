import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import MyOrdersPage from './index';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, logout: async () => {} }),
}));

describe('MyOrdersPage', () => {
  it('renders headline', async () => {
    render(
      <BrowserRouter>
        <MyOrdersPage />
      </BrowserRouter>
    );
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
