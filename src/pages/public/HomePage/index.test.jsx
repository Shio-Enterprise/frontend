import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from './index';

vi.mock('../../../components/layout/public/PublicLayout', () => ({ default: ({ children }) => <main>{children}</main> }));
vi.mock('../../../components/ui/WelcomeModal', () => ({ default: () => null }));

const response = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
const mount = () => render(<MemoryRouter><HomePage /></MemoryRouter>);

describe('HomePage content', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url) => url.includes('/homepage/')
      ? response({ tagline: 'Novo drop', banners: [{ id: 'b1', image_desktop: '/desktop.png', image_mobile: '/mobile.png', alt_text: 'Ver drop', link: '/drop/novo' }] })
      : response({ results: [] })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows configured banner, mobile image, link and tagline', async () => {
    mount();
    expect(await screen.findByText('Novo drop')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver drop' })).toHaveAttribute('href', '/drop/novo');
    expect(screen.getByRole('img', { name: 'Ver drop' })).toHaveAttribute('src', '/desktop.png');
    expect(document.querySelector('source[media="(max-width: 767px)"]')).toHaveAttribute('srcset', '/mobile.png');
  });

  it('uses existing images when no banner is registered', async () => {
    fetch.mockImplementation((url) => url.includes('/homepage/')
      ? response({ tagline: 'Faixa nova', banners: [] }) : response({ results: [] }));
    mount();
    expect(await screen.findByText('Faixa nova')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Pré-venda do Novo Drop/i })).toHaveAttribute('src', '/images/shio/hero-slide-1.png');
  });

  it('keeps the default content when the homepage request fails', async () => {
    fetch.mockImplementation((url) => url.includes('/homepage/')
      ? Promise.reject(new Error('offline')) : response({ results: [] }));
    mount();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/homepage/'), expect.any(Object)));
    expect(screen.getByText('Deus primeiro. Negócios depois.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Pré-venda do Novo Drop/i })).toBeInTheDocument();
  });
});
