import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExportButton from './ExportButton';

const downloadFileMock = vi.hoisted(() => vi.fn());
vi.mock('../../lib/downloadFile', () => ({
  downloadFile: downloadFileMock,
}));

describe('ExportButton component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza o botão com texto padrão e ícone', () => {
    render(<ExportButton endpoint="/api/orders/admin/export/" />);
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeInTheDocument();
  });

  it('abre menu de opções ao clicar no botão', () => {
    render(<ExportButton endpoint="/api/orders/admin/export/" />);
    const button = screen.getByRole('button', { name: 'Exportar' });

    fireEvent.click(button);

    expect(screen.getByRole('menu', { name: 'Opções de exportação' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /CSV/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Excel/i })).toBeInTheDocument();
  });

  it('dispara download em CSV ao selecionar opção CSV', async () => {
    downloadFileMock.mockResolvedValueOnce('pedidos.csv');

    render(
      <ExportButton
        endpoint="/api/orders/admin/export/"
        params={{ status: 'PAID', search: 'Maria' }}
        fallbackFilename="pedidos"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /CSV/i }));

    await waitFor(() => {
      expect(downloadFileMock).toHaveBeenCalledWith(
        '/api/orders/admin/export/',
        { status: 'PAID', search: 'Maria', file_format: 'csv' },
        'pedidos.csv'
      );
    });
  });

  it('dispara download em Excel ao selecionar opção XLSX', async () => {
    downloadFileMock.mockResolvedValueOnce('pedidos.xlsx');

    render(
      <ExportButton
        endpoint="/api/orders/admin/export/"
        params={{ status: 'PAID' }}
        fallbackFilename="pedidos"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Excel/i }));

    await waitFor(() => {
      expect(downloadFileMock).toHaveBeenCalledWith(
        '/api/orders/admin/export/',
        { status: 'PAID', file_format: 'xlsx' },
        'pedidos.xlsx'
      );
    });
  });

  it('exibe estado de carregamento durante a exportação', async () => {
    let resolveDownload;
    downloadFileMock.mockImplementationOnce(
      () => new Promise((resolve) => { resolveDownload = resolve; })
    );

    render(<ExportButton endpoint="/api/orders/admin/export/" />);

    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /CSV/i }));

    // Durante o download
    expect(screen.getByText('Exportando...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar' })).toBeDisabled();

    // Finaliza download
    resolveDownload('pedidos.csv');
    await waitFor(() => {
      expect(screen.queryByText('Exportando...')).not.toBeInTheDocument();
    });
  });

  it('exibe mensagem de erro caso o download falhe', async () => {
    downloadFileMock.mockRejectedValueOnce(new Error('Erro de conexão com o servidor'));

    render(<ExportButton endpoint="/api/orders/admin/export/" />);

    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /CSV/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Erro de conexão com o servidor');
  });
});
