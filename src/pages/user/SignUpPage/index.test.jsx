import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SignUpPage from './index';
import { useAuth } from '../../../context/AuthContext';

vi.mock('../../../context/AuthContext');

describe('SignUpPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({
      registerWithPassword: vi.fn(),
    });
  });

  it('renders headline', () => {
    render(
      <MemoryRouter>
        <SignUpPage />
      </MemoryRouter>
    );
    const headline = screen.getByText(/Bem vindo/i);
    expect(headline).toBeInTheDocument();
  });
});
