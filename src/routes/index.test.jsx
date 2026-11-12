import { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import routes from './index';

// Páginas trocadas por marcadores: o teste é do roteamento, não das páginas.
vi.mock('../components/layout/admin/AdminLayout', () => ({ default: ({ children }) => <>{children}</> }));
vi.mock('../pages/public/NotFoundPage', () => ({ default: () => <h1>Página não encontrada</h1> }));
vi.mock('../pages/public/CartPage', () => ({ default: () => <h1>Carrinho</h1> }));
vi.mock('../pages/public/HomePage', () => ({ default: () => <h1>Início</h1> }));
vi.mock('../pages/public/ProductDetailPage', () => ({ default: () => <h1>Produto</h1> }));
vi.mock('../pages/admin/CustomersPage', () => ({ default: () => <h1>Clientes</h1> }));

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Suspense fallback={null}>
        <Routes>
          {routes.map((route) => (
            <Route key={route.path} path={route.path} element={route.component} />
          ))}
        </Routes>
      </Suspense>
    </MemoryRouter>,
  );

describe('rotas', () => {
  it.each(['/qualquer-coisa', '/produto/123', '/admin/qualquer-coisa', '/admin/customers/c1/outra'])(
    'endereço desconhecido %s mostra "Página não encontrada" (#90)',
    async (path) => {
      renderAt(path);
      expect(await screen.findByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
    },
  );

  it.each([
    ['/cart', 'Carrinho'],
    ['/', 'Início'],
    ['/product/abc', 'Produto'],
    ['/admin/customers/c1', 'Clientes'],
    ['/admin/customers/c1/edit', 'Clientes'],
  ])('endereço conhecido %s abre a página certa', async (path, heading) => {
    renderAt(path);
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Página não encontrada' })).not.toBeInTheDocument();
  });

  it('a rota "*" é pública e fica por último', () => {
    const last = routes.at(-1);
    expect(last.path).toBe('*');
    expect(last.isAdmin).toBeFalsy();
    expect(last.isPrivate).toBe(false);
  });

  it('editar cliente pede a permissão de clientes (#100)', () => {
    const edit = routes.find((route) => route.path === '/admin/customers/:id/edit');
    const profile = routes.find((route) => route.path === '/admin/customers/:id');
    expect(edit.isAdmin).toBe(true);
    expect(edit.requiredPermission).toBe(profile.requiredPermission);
  });
});
