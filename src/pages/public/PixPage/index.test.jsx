import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import PixPage from './index';

vi.mock('../../../components/layout/public/PublicLayout', () => ({ default: ({ children }) => <main>{children}</main> }));

const orderId = '10000000-0000-4000-8000-000000000001';
const order = { id: orderId, total_amount: '100.00', status: 'AWAITING_PAYMENT', payment: { status: 'PROCESSING', method: 'UNKNOWN' } };
const response = (data = order, status = 200) => ({ ok: status === 200, status, json: async () => data });
const renderReturn = (search = `?order_nsu=${orderId}`, state) => render(
  <MemoryRouter initialEntries={[{ pathname: '/pix', search, state }]}><PixPage /></MemoryRouter>
);

beforeEach(() => {
  localStorage.setItem('accessToken', 'test-token');
  vi.stubGlobal('fetch', vi.fn(async () => response()));
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('PixPage', () => {
  it('should not promise an order confirmation email', async () => {
    fetch.mockResolvedValue(response({ ...order, payment: { status: 'PAID', method: 'PIX' } }));
    renderReturn();
    await screen.findByText('Pagamento confirmado!');
    expect(screen.queryByText(/enviamos.*e-mail/i)).not.toBeInTheDocument();
  });

  it('should show the discount fetched from the order detail on the real redirect flow', async () => {
    fetch.mockResolvedValue(response({
      ...order, discount_amount: '20.00', total_amount: '95.00',
      payment: { status: 'PAID', method: 'PIX' },
    }));
    renderReturn(`?order_nsu=${orderId}&transaction_nsu=TX-1&slug=shio`, { discount: 999 });
    expect(await screen.findByText(/Desconto de boas-vindas/)).toBeInTheDocument();
    expect(screen.getByText('- R$ 20.00')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*95,00/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toContain(`/api/orders/my-orders/${orderId}/`);
  });

  it('renders headline', () => {
    render(
      <BrowserRouter>
        <PixPage />
      </BrowserRouter>
    );
    const headline = screen.getByText(/PixPage/i);
    expect(headline).toBeInTheDocument();
  });

  it('consulta o próprio pedido com autenticação e mantém pagamento em processamento', async () => {
    renderReturn(`?order_nsu=${orderId}&paid=true&capture_method=pix&transaction_nsu=fraude&slug=fraude`);
    expect(screen.getByRole('status')).toHaveTextContent('Consultando pagamento...');
    expect(await screen.findByText('Pagamento em processamento')).toBeInTheDocument();
    expect(screen.getByText('A confirmar')).toBeInTheDocument();
    expect(screen.queryByText('Pagamento confirmado!')).not.toBeInTheDocument();
    expect(screen.queryByText(/Copiar Código PIX/)).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`/api/orders/my-orders/${orderId}/`), expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }));
  });

  it.each([['PIX', 'PIX'], ['CREDIT_CARD', 'Cartão de crédito']])('exibe confirmação e método %s apenas conforme o backend', async (method, label) => {
    fetch.mockResolvedValue(response({ ...order, status: 'SHIPPED', payment: { status: 'PAID', method } }));
    renderReturn(`?order_nsu=${orderId}&capture_method=outro`, { total: 1, paymentMethod: 'outro' });
    expect(await screen.findByText('Pagamento confirmado!')).toBeInTheDocument();
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*100,00/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Consultar novamente' })).not.toBeInTheDocument();
  });

  it.each([['PENDING', 'Aguardando pagamento'], ['FAILED', 'Pagamento não concluído'], ['REFUNDED', 'Pagamento reembolsado']])('representa %s sem mostrar sucesso', async (status, label) => {
    fetch.mockResolvedValue(response({ ...order, status: 'PAID', payment: { status, method: 'UNKNOWN' } }));
    renderReturn();
    expect(await screen.findByText(label)).toBeInTheDocument();
    expect(screen.queryByText('Pagamento confirmado!')).not.toBeInTheDocument();
  });

  it.each(['', '?order_nsu=TESTE-123', '?order_nsu=invalido'])('não confirma acesso sem identificador válido: %s', async (search) => {
    renderReturn(search, { orderNumber: '123', total: 100, paymentMethod: 'pix' });
    expect(await screen.findByText('Pedido não identificado')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByText('Pagamento confirmado!')).not.toBeInTheDocument();
  });

  it('pede autenticação quando a sessão está ausente', async () => {
    localStorage.clear();
    renderReturn();
    expect(await screen.findByText('Entre para consultar seu pagamento')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('pede autenticação quando o backend retorna 401', async () => {
    fetch.mockResolvedValue(response({}, 401));
    renderReturn();
    expect(await screen.findByText('Entre para consultar seu pagamento')).toBeInTheDocument();
  });

  it.each([404, 503])('erro HTTP %s não é confirmação nem falha de pagamento', async (code) => {
    fetch.mockResolvedValue(response({ message: 'Pagamento confirmado!' }, code));
    renderReturn();
    expect(await screen.findByText('Não foi possível consultar o pagamento')).toBeInTheDocument();
    expect(screen.queryByText('Pagamento confirmado!')).not.toBeInTheDocument();
  });

  it.each([{}, { ...order, id: 'outro', payment: { status: 'PAID' } }, { ...order, payment: { status: 'success' } }])('não confia em resposta inválida', async (data) => {
    fetch.mockResolvedValue(response(data));
    renderReturn();
    expect(await screen.findByText('Não foi possível consultar o pagamento')).toBeInTheDocument();
  });

  it('permite consultar novamente após falha de rede sem criar outra compra', async () => {
    fetch.mockRejectedValueOnce(new Error('Sem conexão'));
    renderReturn();
    fireEvent.click(await screen.findByRole('button', { name: 'Consultar novamente' }));
    expect(await screen.findByText('Pagamento em processamento')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('consulta novamente um pendente e mostra confirmação quando o backend atualizar', async () => {
    renderReturn();
    await screen.findByText('Pagamento em processamento');
    expect(fetch).toHaveBeenCalledTimes(1);
    fetch.mockResolvedValue(response({ ...order, payment: { status: 'PAID', method: 'PIX' } }));
    fireEvent.click(screen.getByRole('button', { name: 'Consultar novamente' }));
    await screen.findByText('Pagamento confirmado!');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('mantém a consulta em carregamento e cancela ao sair da página', async () => {
    let finish;
    fetch.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const page = renderReturn();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Consultando pagamento...')).toBeInTheDocument();
    const signal = fetch.mock.calls[0][1].signal;
    page.unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => finish(response()));
  });
});
