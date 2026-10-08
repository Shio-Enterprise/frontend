import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import RatingInput from './RatingInput';

function Controlled({ initial = null, onChange }) {
  const [value, setValue] = useState(initial);
  return (
    <RatingInput
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

const radio = (name) => screen.getByRole('radio', { name });

describe('RatingInput', () => {
  it('expõe 5 opções e marca a nota clicada', () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    expect(screen.getByRole('radiogroup', { name: 'Nota' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    fireEvent.click(radio('4 estrelas'));
    expect(onChange).toHaveBeenLastCalledWith(4);
    expect(radio('4 estrelas')).toHaveAttribute('aria-checked', 'true');
    expect(radio('5 estrelas')).toHaveAttribute('aria-checked', 'false');
  });

  it('só uma opção entra no Tab: a escolhida ou a primeira', () => {
    const { unmount } = render(<Controlled onChange={vi.fn()} />);
    expect(radio('1 estrela')).toHaveAttribute('tabindex', '0');
    expect(radio('3 estrelas')).toHaveAttribute('tabindex', '-1');
    unmount();
    render(<Controlled initial={3} onChange={vi.fn()} />);
    expect(radio('3 estrelas')).toHaveAttribute('tabindex', '0');
    expect(radio('1 estrela')).toHaveAttribute('tabindex', '-1');
  });

  it('setas mudam a nota, movem o foco e ficam entre 1 e 5', () => {
    const onChange = vi.fn();
    render(<Controlled initial={4} onChange={onChange} />);
    fireEvent.keyDown(radio('4 estrelas'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith(5);
    expect(document.activeElement).toBe(radio('5 estrelas'));
    fireEvent.keyDown(radio('5 estrelas'), { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(5);
    for (let i = 0; i < 5; i += 1) fireEvent.keyDown(document.activeElement, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(document.activeElement, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(onChange.mock.calls.every(([n]) => Number.isInteger(n) && n >= 1 && n <= 5)).toBe(true);
  });

  it('sem nota, seta para a direita escolhe 1', () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    fireEvent.keyDown(radio('1 estrela'), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith(1);
  });
});
