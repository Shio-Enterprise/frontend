import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import PixPage from './index';

describe('PixPage', () => {
  it('renders headline', () => {
    render(
      <BrowserRouter>
        <PixPage />
      </BrowserRouter>
    );
    const headline = screen.getByText(/PixPage/i);
    expect(headline).toBeInTheDocument();
  });

  it('should not promise an order confirmation email', () => {
    render(
      <MemoryRouter initialEntries={['/pix']}>
        <PixPage />
      </MemoryRouter>
    );
    expect(screen.queryByText(/enviamos.*e-mail/i)).not.toBeInTheDocument();
  });
});
