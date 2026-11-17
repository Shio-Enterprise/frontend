import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import NotFoundPage from './index';

// Layout de verdade (SkipLink e <main>); só o que busca dados fica de fora.
vi.mock('../../../components/layout/public/Navbar', () => ({ default: () => <nav aria-label="Menu">Navbar</nav> }));
vi.mock('../../../components/layout/shared/Footer', () => ({ default: () => <footer>Footer</footer> }));
vi.mock('../../../components/ui/DropOpenedModal', () => ({ default: () => null }));

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <NotFoundPage />
    </MemoryRouter>,
  );

describe('NotFoundPage (#90)', () => {
  it('mostra a mensagem com menu, rodapé e os links da loja', () => {
    renderAt('/qualquer-coisa');
    expect(screen.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Menu' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para a loja' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Ver produtos' })).toHaveAttribute('href', '/category/all');
    expect(screen.queryByRole('link', { name: 'Ir para o painel' })).not.toBeInTheDocument();
  });

  it('em /admin mostra também o link para o painel', () => {
    renderAt('/admin/qualquer-coisa');
    expect(screen.getByRole('link', { name: 'Ir para o painel' })).toHaveAttribute('href', '/admin/dashboard');
    expect(screen.getByRole('link', { name: 'Voltar para a loja' })).toBeInTheDocument();
  });

  it('não confunde /administracao com o painel', () => {
    renderAt('/administracao');
    expect(screen.queryByRole('link', { name: 'Ir para o painel' })).not.toBeInTheDocument();
  });

  it('o primeiro item focável é o "Pular para o conteúdo"', () => {
    const { container } = renderAt('/qualquer-coisa');
    const first = container.querySelector('a, button, input, select, textarea, [tabindex="0"]');
    expect(first).toBe(screen.getByRole('link', { name: 'Pular para o conteúdo' }));
  });

  it.each(['/qualquer-coisa', '/admin/qualquer-coisa'])('sem violações de acessibilidade em %s', async (path) => {
    const { container } = renderAt(path);
    expect(await axe(container)).toHaveNoViolations();
  });
});
