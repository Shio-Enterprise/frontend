import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AdminModal from './AdminModal';

const renderModal = (props = {}) => render(
  <AdminModal
    title="Aprovar reembolso"
    titleId="refund-review-title"
    onClose={vi.fn()}
    onSubmit={vi.fn((event) => event.preventDefault())}
    submitLabel="Confirmar"
    canSubmit
    {...props}
  >
    <label htmlFor="obs">Observação</label>
    <input id="obs" />
  </AdminModal>,
);

describe('AdminModal', () => {
  it('é um formulário anunciado como modal com o título', () => {
    renderModal();
    const dialog = screen.getByRole('dialog', { name: 'Aprovar reembolso' });
    expect(dialog.tagName).toBe('FORM');
  });

  it('Tab no botão de confirmar volta para o primeiro campo', () => {
    renderModal();
    const confirmar = screen.getByRole('button', { name: 'Confirmar' });
    confirmar.focus();
    fireEvent.keyDown(confirmar, { key: 'Tab' });
    expect(screen.getByLabelText('Observação')).toHaveFocus();
  });

  it('fecha com Esc', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.keyDown(screen.getByLabelText('Observação'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não fecha com clique fora, para não perder o que foi digitado', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByTestId('dialog-backdrop'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('envia o formulário pelo botão de confirmar', () => {
    const onSubmit = vi.fn((event) => event.preventDefault());
    renderModal({ onSubmit });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
