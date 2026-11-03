import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PublicLayout from '../public/PublicLayout';
import AdminLayout from '../admin/AdminLayout';

vi.mock('../public/Navbar', () => ({ default: () => <nav>Navbar</nav> }));
vi.mock('../admin/AdminNavbar', () => ({ default: () => <nav>AdminNavbar</nav> }));
vi.mock('./Footer', () => ({ default: () => <footer>Footer</footer> }));
vi.mock('../../ui/DropOpenedModal', () => ({ default: () => null }));

describe.each([
  ['PublicLayout', PublicLayout],
  ['AdminLayout', AdminLayout],
])('%s', (_, Layout) => {
  it('começa com o link "Pular para o conteúdo" apontando para o <main>', () => {
    const { container } = render(<Layout>Conteúdo</Layout>);
    const link = screen.getByRole('link', { name: 'Pular para o conteúdo' });
    const main = screen.getByRole('main');

    expect(container.querySelector('a, button, input, select, textarea')).toBe(link);
    expect(link).toHaveAttribute('href', `#${main.id}`);
    expect(main).toHaveAttribute('tabindex', '-1');
  });
});
