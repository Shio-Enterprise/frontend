import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'vitest-axe';
import { ActionMenu } from './ShioDesign';

vi.mock('../../lib/axios', () => ({ default: { post: vi.fn() } }));

const renderMenu = (onDelete = vi.fn()) => render(
  <MemoryRouter>
    <button type="button">antes</button>
    <ActionMenu
      label="Ações para Camiseta"
      items={[
        { label: 'Ver detalhes', to: '/admin/products/1' },
        { label: 'Enviar', disabled: true, onClick: vi.fn() },
        { separator: true, key: 'sep' },
        { label: 'Excluir', danger: true, onClick: onDelete },
      ]}
    />
  </MemoryRouter>,
);

describe('ActionMenu (#64)', () => {
  it('abre com o foco no primeiro item e anuncia o estado', () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Ações para Camiseta' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: 'Ações para Camiseta' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Ver detalhes' })).toHaveFocus();
  });

  it('setas, Home e End percorrem os itens (incluindo o desabilitado)', () => {
    renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Ações para Camiseta' }));
    const menu = screen.getByRole('menu');

    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(screen.getByRole('menuitem', { name: 'Enviar' })).toHaveFocus();
    expect(screen.getByRole('menuitem', { name: 'Enviar' })).toHaveAttribute('aria-disabled', 'true');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(screen.getByRole('menuitem', { name: 'Excluir' })).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(screen.getByRole('menuitem', { name: 'Ver detalhes' })).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'ArrowUp' });
    expect(screen.getByRole('menuitem', { name: 'Excluir' })).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'Home' });
    expect(screen.getByRole('menuitem', { name: 'Ver detalhes' })).toHaveFocus();
    fireEvent.keyDown(menu, { key: 'End' });
    expect(screen.getByRole('menuitem', { name: 'Excluir' })).toHaveFocus();
  });

  it('Esc e Tab fecham e devolvem o foco ao botão', () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: 'Ações para Camiseta' });

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Tab' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('item desabilitado não executa; item ativo fecha, devolve o foco e executa', () => {
    const onDelete = vi.fn(() => {
      // A ação roda com o foco já no botão: um modal aberto aqui guarda o botão como origem.
      expect(screen.getByRole('button', { name: 'Ações para Camiseta' })).toHaveFocus();
    });
    renderMenu(onDelete);
    fireEvent.click(screen.getByRole('button', { name: 'Ações para Camiseta' }));

    fireEvent.click(screen.getByRole('menuitem', { name: 'Enviar' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Excluir' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('não tem violações de acessibilidade com o menu aberto', async () => {
    const { baseElement } = renderMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Ações para Camiseta' }));
    // region: o teste monta o componente solto, sem os landmarks do layout.
    expect(await axe(baseElement, { rules: { region: { enabled: false } } })).toHaveNoViolations();
  });
});
