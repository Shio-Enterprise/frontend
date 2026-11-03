import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import Dialog from './Dialog';

function Exemplo({ closeOnBackdrop = false, onClose = () => {} }) {
  const [open, setOpen] = useState(false);
  const close = () => {
    onClose();
    setOpen(false);
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Abrir</button>
      {open && (
        <Dialog labelledBy="exemplo-titulo" onClose={close} closeOnBackdrop={closeOnBackdrop}>
          <h2 id="exemplo-titulo">Título do exemplo</h2>
          <button type="button">Primeiro</button>
          <button type="button" onClick={close}>Último</button>
        </Dialog>
      )}
    </>
  );
}

const abrir = () => {
  const gatilho = screen.getByRole('button', { name: 'Abrir' });
  gatilho.focus();
  fireEvent.click(gatilho);
  return gatilho;
};

describe('Dialog', () => {
  it('é anunciado como modal com o título ligado', () => {
    render(<Exemplo />);
    abrir();
    const dialog = screen.getByRole('dialog', { name: 'Título do exemplo' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('recebe o foco ao abrir', () => {
    render(<Exemplo />);
    abrir();
    expect(screen.getByRole('dialog')).toHaveFocus();
  });

  it('fecha com Esc', () => {
    const onClose = vi.fn();
    render(<Exemplo onClose={onClose} />);
    abrir();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('devolve o foco ao botão que abriu ao fechar', () => {
    render(<Exemplo />);
    const gatilho = abrir();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(gatilho).toHaveFocus();
  });

  it('Tab no último item volta para o primeiro', () => {
    render(<Exemplo />);
    abrir();
    const ultimo = screen.getByRole('button', { name: 'Último' });
    ultimo.focus();
    fireEvent.keyDown(ultimo, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Primeiro' })).toHaveFocus();
  });

  it('Shift+Tab no primeiro item vai para o último', () => {
    render(<Exemplo />);
    abrir();
    const primeiro = screen.getByRole('button', { name: 'Primeiro' });
    primeiro.focus();
    fireEvent.keyDown(primeiro, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'Último' })).toHaveFocus();
  });

  it('Shift+Tab com o foco no próprio modal vai para o último item', () => {
    render(<Exemplo />);
    abrir();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'Último' })).toHaveFocus();
  });

  it('fecha com Esc mesmo com o foco fora do modal', () => {
    const onClose = vi.fn();
    render(<Exemplo onClose={onClose} />);
    abrir();
    document.activeElement.blur();
    expect(document.body).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Tab com o foco fora do modal traz o foco de volta para dentro', () => {
    render(<Exemplo />);
    abrir();
    document.activeElement.blur();
    expect(document.body).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Primeiro' })).toHaveFocus();
  });

  it('clicar na área escura não tira o foco do modal', () => {
    render(<Exemplo />);
    abrir();
    const naoCancelado = fireEvent.mouseDown(screen.getByTestId('dialog-backdrop'));
    expect(naoCancelado).toBe(false);
  });

  it('não fecha com clique fora por padrão', () => {
    const onClose = vi.fn();
    render(<Exemplo onClose={onClose} />);
    abrir();
    fireEvent.click(screen.getByTestId('dialog-backdrop'));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('fecha com clique fora quando closeOnBackdrop', () => {
    const onClose = vi.fn();
    render(<Exemplo closeOnBackdrop onClose={onClose} />);
    abrir();
    fireEvent.click(screen.getByTestId('dialog-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clique dentro do modal não fecha mesmo com closeOnBackdrop', () => {
    const onClose = vi.fn();
    render(<Exemplo closeOnBackdrop onClose={onClose} />);
    abrir();
    fireEvent.click(screen.getByText('Título do exemplo'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('trava a rolagem da página enquanto aberto e devolve ao fechar', () => {
    document.body.style.overflow = 'auto';
    render(<Exemplo />);
    abrir();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(document.body.style.overflow).toBe('auto');
  });

  it('renderiza o painel como formulário quando as="form"', () => {
    const onSubmit = vi.fn((event) => event.preventDefault());
    render(
      <Dialog labelledBy="t" onClose={() => {}} as="form" onSubmit={onSubmit}>
        <h2 id="t">Formulário</h2>
        <button type="submit">Enviar</button>
      </Dialog>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog').tagName).toBe('FORM');
  });

  it('não tem violações de acessibilidade', async () => {
    const { container } = render(<Exemplo />);
    abrir();
    expect(await axe(container)).toHaveNoViolations();
  });
});
