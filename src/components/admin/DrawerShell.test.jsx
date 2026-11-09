import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import DrawerShell from './DrawerShell';
import Dialog from '../ui/Dialog';

const setDesktop = (desktop) => {
  vi.stubGlobal('matchMedia', (query) => ({
    matches: desktop,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
};

afterEach(() => vi.unstubAllGlobals());

function Exemplo() {
  const [open, setOpen] = useState(true);
  const [confirm, setConfirm] = useState(false);
  return open ? (
    <DrawerShell title="Detalhes" onClose={() => setOpen(false)}>
      <button type="button" onClick={() => setConfirm(true)}>Aprovar</button>
      {confirm && (
        <Dialog labelledBy="c" onClose={() => setConfirm(false)}>
          <h2 id="c">Aprovar reembolso</h2>
          <button type="button">Confirmar</button>
        </Dialog>
      )}
    </DrawerShell>
  ) : <p>fechado</p>;
}

describe('DrawerShell', () => {
  it('no desktop é painel lateral (não modal) com foco e Esc', () => {
    setDesktop(true);
    render(<Exemplo />);
    const panel = screen.getByRole('complementary', { name: 'Detalhes' });
    expect(document.activeElement).toBe(panel);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.keyDown(panel, { key: 'Escape' });
    expect(screen.getByText('fechado')).toBeInTheDocument();
  });

  it('no celular vira modal', () => {
    setDesktop(false);
    render(<Exemplo />);
    expect(screen.getByRole('dialog', { name: 'Detalhes' })).toHaveAttribute('aria-modal', 'true');
  });

  it.each([['desktop', true], ['celular', false]])('no %s, Esc no modal aberto pelo painel fecha só o modal', (_, desktop) => {
    setDesktop(desktop);
    render(<Exemplo />);
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar' }));
    const confirmar = screen.getByRole('button', { name: 'Confirmar' });
    confirmar.focus();
    fireEvent.keyDown(confirmar, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Aprovar reembolso' })).not.toBeInTheDocument();
    expect(screen.queryByText('fechado')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Detalhes' })).toBeInTheDocument();
  });

  it('o título recebe foco quando quem usa pede (titleRef)', () => {
    setDesktop(true);
    const ref = { current: null };
    render(<DrawerShell title="Pedido" onClose={() => {}} titleRef={ref}><p>x</p></DrawerShell>);
    ref.current.focus();
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Pedido' }));
  });

  it('não tem violações de acessibilidade', async () => {
    setDesktop(true);
    const { container } = render(<Exemplo />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
