import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { axe } from 'vitest-axe';
import PasswordInput from './PasswordInput';

const renderInput = (props = {}) =>
  render(<PasswordInput label="Senha" value="" onChange={vi.fn()} {...props} />);

describe('PasswordInput', () => {
  it('mostra o rótulo visível ligado ao campo', () => {
    renderInput();
    expect(screen.getByText('Senha')).toBeVisible();
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
  });

  it('o olho alterna entre mostrar e ocultar a senha', () => {
    renderInput();
    const field = screen.getByLabelText('Senha');
    const toggle = screen.getByRole('button', { name: 'Mostrar senha' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(toggle).toHaveAttribute('type', 'button');

    fireEvent.click(toggle);
    expect(field).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggle);
    expect(field).toHaveAttribute('type', 'password');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('repassa autoComplete, required e minLength para o campo', () => {
    renderInput({ autoComplete: 'new-password', required: true, minLength: 8 });
    const field = screen.getByLabelText('Senha');
    expect(field).toHaveAttribute('autocomplete', 'new-password');
    expect(field).toBeRequired();
    expect(field).toHaveAttribute('minlength', '8');
  });

  it('liga a mensagem de erro ao campo', () => {
    renderInput({ error: 'As senhas não coincidem.' });
    const field = screen.getByLabelText('Senha');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('As senhas não coincidem.');
  });

  it('sem erro, não marca o campo como inválido', () => {
    renderInput();
    expect(screen.getByLabelText('Senha')).not.toHaveAttribute('aria-invalid');
  });

  it('não tem violações do axe', async () => {
    const { container } = renderInput({ error: 'Erro' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
