import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import NewDropPage from './index';

describe('NewDropPage', () => {
  it('renders headline', () => {
    render(<MemoryRouter><NewDropPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});

describe('NewDropPage — erros ligados ao campo (#64)', () => {
  it('data de encerramento inválida: foco, aria-invalid e mensagem ligada ao campo', () => {
    const { container } = render(<MemoryRouter><NewDropPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Nome do drop'), { target: { value: 'Drop' } });
    fireEvent.change(screen.getByLabelText('Data de lançamento'), { target: { value: '2026-05-10' } });
    const end = screen.getByLabelText('Data de encerramento');
    fireEvent.change(end, { target: { value: '2026-05-01' } });
    fireEvent.submit(container.querySelector('form'));

    expect(end).toHaveFocus();
    expect(end).toHaveAttribute('aria-invalid', 'true');
    expect(end).toHaveAccessibleDescription('A data de encerramento deve ser posterior à data de lançamento.');
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('limite inválido marca o campo de limite', () => {
    const { container } = render(<MemoryRouter><NewDropPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Nome do drop'), { target: { value: 'Drop' } });
    const limit = screen.getByLabelText('Limite de unidades (Opcional)');
    fireEvent.change(limit, { target: { value: '1.5' } });
    fireEvent.submit(container.querySelector('form'));

    expect(limit).toHaveFocus();
    expect(limit).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Data de encerramento')).not.toHaveAttribute('aria-invalid');
  });

  it('remover banner devolve o foco ao botão de adicionar', async () => {
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:banner');
    globalThis.URL.revokeObjectURL = vi.fn();
    const { container } = render(<MemoryRouter><NewDropPage /></MemoryRouter>);
    const file = new File(['x'], 'banner.png', { type: 'image/png' });
    fireEvent.change(container.querySelector('input[type=file]'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Remover banner' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Adicionar banner' })).toHaveFocus());
  });

  it('formulário sem violações de acessibilidade', async () => {
    const { container } = render(<MemoryRouter><NewDropPage /></MemoryRouter>);
    expect(await axe(container)).toHaveNoViolations();
  });
});
