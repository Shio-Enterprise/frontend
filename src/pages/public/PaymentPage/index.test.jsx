import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import PaymentPage from './index';

const cart = {
  subtotal: '200.00',
  items: [{ variation_id: 'variation-1', product_id: 'product-1', product_name: 'Camiseta', size: 'M', quantity: 2, unit_price: '100.00' }],
};
const calculation = {
  shipping_quote_id: 'quote-1',
  items: [{ ...cart.items[0], unit_price: '19.99' }],
  subtotal: '39.98', shipping_cost: '19.92', discount_amount: '0.00', total_amount: '59.90',
};
const addresses = [
  { id: 'address-1', title: 'Casa', zip_code: '71000000', street: 'Rua A', address_number: '1', is_default: true },
  { id: 'address-2', title: 'Trabalho', zip_code: '72000000', street: 'Rua B', address_number: '2' },
];
const jsonResponse = (data, ok = true, status = ok ? 200 : 400) => ({ ok, status, json: async () => data });

const renderPage = () => render(<BrowserRouter><PaymentPage /></BrowserRouter>);

const showReview = async () => {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar para Pagamento' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Continuar para Pagamento' }));
  fireEvent.click(screen.getByRole('button', { name: 'Revisar Pedido' }));
};

let calculationResponse;
let currentCart;
let checkoutResponse;

const confirmQuote = () => fireEvent.click(screen.getByRole('checkbox', { name: /Conferi os itens/ }));

beforeEach(() => {
  localStorage.setItem('accessToken', 'test-token');
  currentCart = cart;
  calculation.expires_at = new Date(Date.now() + 900000).toISOString();
  calculationResponse = async () => jsonResponse(calculation);
  checkoutResponse = async () => jsonResponse({ message: 'Gateway indisponível.' }, false);
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    if (url.endsWith('/checkout/calculate/')) return calculationResponse(options);
    if (url.endsWith('/checkout/')) return checkoutResponse(options);
    if (url.endsWith('/cart/')) return jsonResponse(currentCart);
    if (url.includes('/cart/items/')) return jsonResponse({});
    if (url.endsWith('/addresses/')) return jsonResponse(addresses);
    if (url.endsWith('/me/')) return jsonResponse({ id: 1, phone_number: '61999999999', cpf: '00000000000' });
    if (url.endsWith('/products/product-1/')) return jsonResponse({ id: 'product-1', images: [] });
    return jsonResponse([]);
  }));
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('PaymentPage', () => {
  it('renders headline', () => {
    render(
      <BrowserRouter>
        <PaymentPage />
      </BrowserRouter>
    );
    const headline = screen.getByText(/PaymentPage/i);
    expect(headline).toBeInTheDocument();
  });

  it('exibe valores do servidor e não aplica desconto PIX local', async () => {
    renderPage();
    await showReview();
    expect(screen.getByText('R$ 39.98')).toBeInTheDocument();
    expect(screen.getByText('R$ 19.92')).toBeInTheDocument();
    expect(screen.getByText('R$ 59.90')).toBeInTheDocument();
    expect(screen.getByText('R$ 19.99')).toBeInTheDocument();
    expect(screen.queryByText(/5%/)).not.toBeInTheDocument();
    const call = fetch.mock.calls.find(([url]) => url.endsWith('/checkout/calculate/'));
    expect(JSON.parse(call[1].body)).toEqual({ address_id: 'address-1' });
  });

  it('envia endereço e cotação confirmada e preserva o erro do servidor', async () => {
    renderPage();
    await showReview();
    confirmQuote();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Compra' }));
    expect(await screen.findByText('Gateway indisponível.')).toBeInTheDocument();
    const call = fetch.mock.calls.find(([url]) => url.endsWith('/checkout/'));
    expect(JSON.parse(call[1].body)).toEqual({ address_id: 'address-1', shipping_quote_id: 'quote-1', idempotency_key: expect.any(String) });
  });

  it('não apresenta frete grátis nem permite finalizar quando o cálculo falha', async () => {
    calculationResponse = async () => jsonResponse({ detail: 'Correios indisponíveis.' }, false);
    renderPage();
    await screen.findByText('Correios indisponíveis.');
    expect(screen.getByRole('button', { name: 'Continuar para Pagamento' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /3.*Revisão/ }));
    expect(screen.getByRole('button', { name: 'Finalizar Compra' })).toBeDisabled();
    expect(screen.queryByText('Grátis')).not.toBeInTheDocument();
    expect(screen.queryByText('R$ 0.00')).not.toBeInTheDocument();
  });

  it('descarta resposta atrasada do endereço anterior', async () => {
    let resolveFirst;
    calculationResponse = (options) => JSON.parse(options.body).address_id === 'address-1'
      ? new Promise((resolve) => { resolveFirst = resolve; })
      : Promise.resolve(jsonResponse({ ...calculation, total_amount: '69.90' }));
    renderPage();
    await waitFor(() => expect(resolveFirst).toBeDefined());
    fireEvent.click(screen.getAllByRole('radio')[1]);
    await showReview();
    expect(screen.getByText('R$ 69.90')).toBeInTheDocument();
    await act(async () => { resolveFirst(jsonResponse(calculation)); });
    expect(screen.getByText('R$ 69.90')).toBeInTheDocument();
    expect(screen.queryByText('R$ 59.90')).not.toBeInTheDocument();
  });

  it('recalcula após alterar quantidade e bloqueia enquanto aguarda', async () => {
    renderPage();
    await showReview();
    confirmQuote();
    currentCart = { ...cart, items: [{ ...cart.items[0], quantity: 3 }] };
    let resolveCalculation;
    calculationResponse = () => new Promise((resolve) => { resolveCalculation = resolve; });
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar quantidade de Camiseta' }));
    expect(screen.getByRole('button', { name: 'Finalizar Compra' })).toBeDisabled();
    await waitFor(() => expect(resolveCalculation).toBeDefined());
    await act(async () => {
      resolveCalculation(jsonResponse({ ...calculation, items: [{ ...calculation.items[0], quantity: 3 }], subtotal: '59.97', total_amount: '79.89' }));
    });
    expect(screen.getByText('R$ 79.89')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finalizar Compra' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Conferi os itens/ })).not.toBeChecked();
    confirmQuote();
    expect(screen.getByRole('button', { name: 'Finalizar Compra' })).toBeEnabled();
  });

  it('exige confirmação explícita e mostra a validade da cotação', async () => {
    renderPage();
    await showReview();
    expect(screen.getByText(/Cotação válida até/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finalizar Compra' })).toBeDisabled();
    confirmQuote();
    expect(screen.getByRole('button', { name: 'Finalizar Compra' })).toBeEnabled();
  });

  it('bloqueia cotação expirada ao retornar à janela e exige nova confirmação', async () => {
    renderPage();
    await showReview();
    confirmQuote();
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse(calculation.expires_at) + 1);
    fireEvent(window, new Event('focus'));
    expect(screen.getByRole('button', { name: 'Finalizar Compra' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Cotação expirada');
    calculationResponse = async () => jsonResponse({
      ...calculation, shipping_quote_id: 'quote-2', total_amount: '69.90',
      expires_at: new Date(Date.now() + 900000).toISOString(),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Recalcular cotação' }));
    expect(await screen.findByText('R$ 69.90')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finalizar Compra' })).toBeDisabled();
    expect(fetch.mock.calls.filter(([url]) => url.endsWith('/checkout/'))).toHaveLength(0);
    confirmQuote();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Compra' }));
    await screen.findByText('Gateway indisponível.');
    const call = fetch.mock.calls.find(([url]) => url.endsWith('/checkout/'));
    expect(JSON.parse(call[1].body).shipping_quote_id).toBe('quote-2');
  });

  it('bloqueia expiração pelo temporizador mesmo sem interação', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    calculation.expires_at = new Date(Date.now() + 60000).toISOString();
    renderPage();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    fireEvent.click(screen.getByRole('button', { name: /3.*Revisão/ }));
    confirmQuote();
    expect(screen.getByRole('button', { name: 'Finalizar Compra' })).toBeEnabled();
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(screen.getByRole('button', { name: 'Finalizar Compra' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Cotação expirada');
  });

  it('rejeição do backend exige recálculo sem repetir checkout automaticamente', async () => {
    checkoutResponse = async () => jsonResponse({ shipping_quote_id: ['A compra mudou.'] }, false);
    renderPage();
    await showReview();
    confirmQuote();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Compra' }));
    await screen.findByText(/A cotação não é mais válida/);
    expect(screen.getByRole('button', { name: 'Finalizar Compra' })).toBeDisabled();
    calculationResponse = async () => jsonResponse({ ...calculation, shipping_quote_id: 'quote-2', total_amount: '79.90' });
    fireEvent.click(screen.getByRole('button', { name: 'Recalcular cotação' }));
    await screen.findByText('R$ 79.90');
    expect(screen.getByRole('checkbox', { name: /Conferi os itens/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Finalizar Compra' })).toBeDisabled();
    expect(fetch.mock.calls.filter(([url]) => url.endsWith('/checkout/'))).toHaveLength(1);
  });

  it('trocar endereço descarta confirmação e envia a nova cotação', async () => {
    renderPage();
    await showReview();
    confirmQuote();
    fireEvent.click(screen.getByRole('button', { name: /1.*Entrega/ }));
    calculationResponse = async () => jsonResponse({ ...calculation, shipping_quote_id: 'quote-2' });
    fireEvent.click(screen.getAllByRole('radio')[1]);
    await showReview();
    expect(screen.getByRole('button', { name: 'Finalizar Compra' })).toBeDisabled();
    confirmQuote();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Compra' }));
    await screen.findByText('Gateway indisponível.');
    const call = fetch.mock.calls.find(([url]) => url.endsWith('/checkout/'));
    expect(JSON.parse(call[1].body)).toEqual({ address_id: 'address-2', shipping_quote_id: 'quote-2', idempotency_key: expect.any(String) });
  });

  it('remoção do último item bloqueia a finalização', async () => {
    renderPage();
    await showReview();
    confirmQuote();
    currentCart = { items: [], subtotal: '0.00' };
    fireEvent.click(screen.getByRole('button', { name: 'Remover Camiseta' }));
    await waitFor(() => expect(screen.queryByText('Camiseta')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Finalizar Compra' })).toBeDisabled();
  });

  it('não aceita resposta sem identificador ou validade', async () => {
    calculationResponse = async () => jsonResponse({ ...calculation, shipping_quote_id: null });
    renderPage();
    await screen.findByText(/Não foi possível validar a cotação/);
    expect(screen.getByRole('button', { name: 'Continuar para Pagamento' })).toBeDisabled();
  });

  it('persiste a chave antes do envio e reutiliza após perder a resposta', async () => {
    const sent = [];
    checkoutResponse = async (options) => {
      const payload = JSON.parse(options.body);
      expect(JSON.parse(sessionStorage.getItem('checkout-attempt:1'))).toEqual(payload);
      sent.push(payload);
      throw new TypeError('Conexão interrompida');
    };
    renderPage();
    await showReview();
    confirmQuote();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Compra' }));
    await screen.findByText('Conexão interrompida');
    fireEvent.click(screen.getByRole('button', { name: 'Consultar tentativa' }));
    await waitFor(() => expect(sent).toHaveLength(2));
    expect(sent[1]).toEqual(sent[0]);
    expect(sent[0].idempotency_key).toMatch(/^[0-9a-f-]{36}$/i);
    expect(screen.getByRole('button', { name: 'Aumentar quantidade de Camiseta' })).toBeDisabled();
  });

  it('recupera tentativa após recarregar mesmo com carrinho vazio e cotação expirada', async () => {
    const saved = { address_id: 'old-address', shipping_quote_id: 'old-quote', idempotency_key: 'saved-key' };
    sessionStorage.setItem('checkout-attempt:1', JSON.stringify(saved));
    currentCart = { items: [], subtotal: '0.00' };
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Consultar tentativa' }));
    await screen.findByText('Gateway indisponível.');
    const call = fetch.mock.calls.find(([url]) => url.endsWith('/checkout/'));
    expect(JSON.parse(call[1].body)).toEqual(saved);
  });

  it('não recupera tentativa de outra conta', async () => {
    sessionStorage.setItem('checkout-attempt:2', JSON.stringify({ idempotency_key: 'other-key' }));
    renderPage();
    await showReview();
    expect(screen.queryByRole('button', { name: 'Consultar tentativa' })).not.toBeInTheDocument();
  });

  it('bloqueia clique repetido enquanto a primeira requisição está pendente', async () => {
    let resolveCheckout;
    checkoutResponse = () => new Promise((resolve) => { resolveCheckout = resolve; });
    renderPage();
    await showReview();
    confirmQuote();
    const button = screen.getByRole('button', { name: 'Finalizar Compra' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(fetch.mock.calls.filter(([url]) => url.endsWith('/checkout/'))).toHaveLength(1);
    await act(async () => { resolveCheckout(jsonResponse({ message: 'Processando', status: 'PROCESSING' }, true, 202)); });
    expect(screen.getByRole('button', { name: 'Consultar tentativa' })).toBeDisabled();
  });

  it('respeita espera de processamento sem polling automático', async () => {
    checkoutResponse = async () => ({ ...jsonResponse({ status: 'PROCESSING', message: 'Processando' }, true, 202), headers: { get: () => '3' } });
    renderPage();
    await showReview();
    confirmQuote();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Finalizar Compra' })); });
    expect(screen.getByRole('button', { name: 'Consultar tentativa' })).toBeDisabled();
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(screen.getByRole('button', { name: 'Consultar tentativa' })).toBeEnabled();
    expect(fetch.mock.calls.filter(([url]) => url.endsWith('/checkout/'))).toHaveLength(1);
  });

  it('não envia checkout se o navegador não consegue persistir a tentativa', async () => {
    renderPage();
    await showReview();
    confirmQuote();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Armazenamento indisponível'); });
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Compra' }));
    await screen.findByText('Armazenamento indisponível');
    expect(fetch.mock.calls.filter(([url]) => url.endsWith('/checkout/'))).toHaveLength(0);
  });

  it('recupera tentativa original quando outra aba já iniciou o checkout', async () => {
    const original = { address_id: 'address-1', shipping_quote_id: 'quote-1', idempotency_key: 'original-key' };
    checkoutResponse = async () => jsonResponse({ code: 'checkout_already_started', attempt: original, message: 'Consulte a tentativa original.' }, false, 409);
    renderPage();
    await showReview();
    confirmQuote();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Compra' }));
    await screen.findByText('Consulte a tentativa original.');
    expect(JSON.parse(sessionStorage.getItem('checkout-attempt:1'))).toEqual(original);
    checkoutResponse = async () => jsonResponse({ message: 'Conferência necessária.', status: 'UNCERTAIN' }, false, 503);
    fireEvent.click(screen.getByRole('button', { name: 'Consultar tentativa' }));
    await screen.findByText('Conferência necessária.');
    const calls = fetch.mock.calls.filter(([url]) => url.endsWith('/checkout/'));
    expect(JSON.parse(calls[1][1].body)).toEqual(original);
  });
});
