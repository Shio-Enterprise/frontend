import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReviewForm from './ReviewForm';

describe('ReviewForm', () => {
  it('só envia depois de escolher a nota, com comentário sem espaços nas pontas', () => {
    const onSubmit = vi.fn();
    render(<ReviewForm onSubmit={onSubmit} />);
    const submit = screen.getByRole('button', { name: 'Publicar avaliação' });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: '4 estrelas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Certo' }));
    fireEvent.change(screen.getByLabelText(/Comentário/), { target: { value: '  Tecido ótimo  ' } });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    expect(onSubmit).toHaveBeenCalledWith({ rating: 4, comment: 'Tecido ótimo', fit: 'TRUE_TO_SIZE' });
  });

  it('mostra o contador de caracteres com limite de 1000', () => {
    render(<ReviewForm onSubmit={vi.fn()} />);
    const comment = screen.getByLabelText(/Comentário/);
    expect(comment).toHaveAttribute('maxLength', '1000');
    fireEvent.change(comment, { target: { value: 'abc' } });
    expect(screen.getByText('3/1000')).toBeInTheDocument();
  });

  it('caimento funciona como liga/desliga', () => {
    const onSubmit = vi.fn();
    render(<ReviewForm onSubmit={onSubmit} />);
    const large = screen.getByRole('button', { name: 'Grande' });
    fireEvent.click(large);
    expect(large).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(large);
    expect(large).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('radio', { name: '2 estrelas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publicar avaliação' }));
    expect(onSubmit).toHaveBeenCalledWith({ rating: 2, comment: '', fit: '' });
  });

  it('preenche com a avaliação existente e mostra erro e estado de envio', () => {
    const { rerender } = render(
      <ReviewForm
        initialReview={{ rating: 3, comment: 'Ok', fit: 'SMALL' }}
        submitLabel="Salvar alterações"
        error="Algo deu errado."
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole('radio', { name: '3 estrelas' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText(/Comentário/)).toHaveValue('Ok');
    expect(screen.getByRole('button', { name: 'Pequeno' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Algo deu errado.');
    rerender(<ReviewForm initialReview={{ rating: 3 }} submitting onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Enviando...' })).toBeDisabled();
  });

  it('chama onCancel', () => {
    const onCancel = vi.fn();
    render(<ReviewForm onSubmit={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
