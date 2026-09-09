import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import PaymentPage from './index';

const cart = {
  subtotal: '200.00',
  items: [{ variation_id: 'variation-1', product_id: 'product-1', product_name: 'Camiseta', size: 'M', quantity: 2, unit_price: '100.00' }],
};
const calculation = {
  items: [{ ...cart.items[0], unit_price: '19.99' }],
  subtotal: '39.98', shipping_cost: '19.92', discount_amount: '0.00', total_amount: '59.90',
};
const addresses = [
  { id: 'address-1', title: 'Casa', zip_code: '71000000', street: 'Rua A', address_number: '1', is_default: true },
  { id: 'address-2', title: 'Trabalho', zip_code: '72000000', street: 'Rua B', address_number: '2' },
];
const jsonResponse = (data, ok = true) => ({ ok, json: async () => data });

const renderPage = () => render(<BrowserRouter><PaymentPage /></BrowserRouter>);

const showReview = async () => {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Continuar para Pagamento' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Continuar para Pagamento' }));
  fireEvent.click(screen.getByRole('button', { name: 'Revisar Pedido' }));
};

let calculationResponse;
let currentCart;

beforeEach(() => {
  localStorage.setItem('accessToken', 'test-token');
  currentCart = cart;
  calculationResponse = async () => jsonResponse(calculation);
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    if (url.endsWith('/checkout/calculate/')) return calculationResponse(options);
    if (url.endsWith('/checkout/')) return jsonResponse({ message: 'Gateway indisponível.' }, false);
    if (url.endsWith('/cart/')) return jsonResponse(currentCart);
    if (url.includes('/cart/items/')) return jsonResponse({});
    if (url.endsWith('/addresses/')) return jsonResponse(addresses);
    if (url.endsWith('/me/')) return jsonResponse({ phone_number: '61999999999', cpf: '00000000000' });
    if (url.endsWith('/products/product-1/')) return jsonResponse({ id: 'product-1', images: [] });
    return jsonResponse([]);
  }));
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
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

  it('envia apenas endereço ao finalizar e preserva o erro do servidor', async () => {
    renderPage();
    await showReview();
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar Compra' }));
    expect(await screen.findByText('Gateway indisponível.')).toBeInTheDocument();
    const call = fetch.mock.calls.find(([url]) => url.endsWith('/checkout/'));
    expect(JSON.parse(call[1].body)).toEqual({ address_id: 'address-1' });
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
    expect(screen.getByRole('button', { name: 'Finalizar Compra' })).toBeEnabled();
  });
});
