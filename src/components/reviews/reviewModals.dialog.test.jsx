import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReviewModal from './ReviewModal';
import RemoveReviewModal from './RemoveReviewModal';

const review = { id: 1, author_name: 'Cliente Um', product_name: 'Boné Shio', rating: 5, comment: 'Bom', status: 'PUBLISHED' };

const cases = [
  ['ReviewModal', 'Avaliar produto', (onClose) => <ReviewModal productId={1} productName="Boné Shio" onClose={onClose} onSaved={vi.fn()} onDeleted={vi.fn()} />],
  ['RemoveReviewModal', 'Remover avaliação', (onClose) => <RemoveReviewModal review={review} onClose={onClose} onRemoved={vi.fn()} />],
];

describe.each(cases)('%s com <Dialog>', (_, title, ui) => {
  const setup = () => {
    const onClose = vi.fn();
    render(ui(onClose));
    const dialog = screen.getByRole('dialog', { name: title });
    const focusables = [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select, textarea')];
    return { dialog, focusables, onClose };
  };

  it('Tab no último item volta para o primeiro', () => {
    const { focusables } = setup();
    const last = focusables[focusables.length - 1];
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(focusables[0]).toHaveFocus();
  });

  it('fecha com Esc', () => {
    const { dialog, onClose } = setup();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não fecha com clique fora', () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByTestId('dialog-backdrop'));
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('ReviewModal — confirmação de exclusão', () => {
  const setup = () => render(
    <ReviewModal productId={1} productName="Boné Shio" review={review} onClose={vi.fn()} onSaved={vi.fn()} onDeleted={vi.fn()} />,
  );

  it('ao pedir para excluir, o foco vai para "Manter" (opção segura)', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir avaliação' }));
    expect(screen.getByRole('button', { name: 'Manter' })).toHaveFocus();
  });

  it('ao escolher "Manter", o foco volta para "Excluir avaliação"', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir avaliação' }));
    fireEvent.click(screen.getByRole('button', { name: 'Manter' }));
    expect(screen.getByRole('button', { name: 'Excluir avaliação' })).toHaveFocus();
  });
});
