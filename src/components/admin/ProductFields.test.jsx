import { pricePayload, toSaoPauloInput } from './productForm';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { VariationFields, ProductPriceFields, MarginSummary } from './ProductFields';

describe('product fields', () => {
  it('preserves duplicate colors and accepts independent manual SKUs', () => {
    function Form() {
      const [rows, setRows] = useState([{ source_id: 'first', size: 'M', color: '#FF0000', sku: '', stock_quantity: 0 }, { source_id: 'second', size: 'G', color: '#000000', sku: '', stock_quantity: 0 }]);
      return <><VariationFields duplicate rows={rows} onChange={setRows} /><output data-testid="payload">{JSON.stringify(rows)}</output></>;
    }
    render(<Form />);
    fireEvent.change(screen.getByLabelText('SKU 1'), { target: { value: 'manual-m' } });
    fireEvent.change(screen.getByLabelText('SKU 2'), { target: { value: 'manual-g' } });
    fireEvent.change(screen.getByLabelText('Estoque inicial 1'), { target: { value: '5' } });
    const rows = JSON.parse(screen.getByTestId('payload').textContent);
    expect(rows.map((r) => r.sku)).toEqual(['MANUAL-M', 'MANUAL-G']);
    expect(rows.map((r) => r.color)).toEqual(['#FF0000', '#000000']);
    expect(screen.getByLabelText('Cor 1')).toBeDisabled();
    expect(rows[0].stock_quantity).toBe('5');
  });

  it('serializes promotion in Brasilia time and clears expired dates when removed', () => {
    expect(toSaoPauloInput('2026-09-13T15:00:00Z')).toBe('2026-09-13T12:00');
    const form = { cost_price: '60.00', promotional_price: '80.00', promo_start: '2026-09-13T12:00', promo_end: '2026-09-14T12:00' };
    expect(pricePayload(form).promo_start).toBe('2026-09-13T12:00:00-03:00');
    expect(pricePayload({ ...form, promotional_price: '' })).toEqual({ cost_price: '60.00', promotional_price: null, promo_start: null, promo_end: null });
  });

  it('shows negative margin and unavailable percent at zero price', () => {
    render(<ProductPriceFields form={{ base_price: '0', cost_price: '60', promotional_price: '', promo_start: '', promo_end: '' }} onChange={() => {}} />);
    expect(screen.getByText(/R\$ -60.00 \/ percentual indisponível/)).toBeInTheDocument();
    expect(screen.getByLabelText('Custo unitário')).toBeRequired();
  });

  it('does not invent a missing legacy cost', () => {
    render(<MarginSummary product={{ cost_price: null, margin_amount: null, margin_percent: null }} />);
    expect(screen.getByText(/Custo não informado/)).toBeInTheDocument();
    expect(screen.getByText(/Margem estimada: Indisponível/)).toBeInTheDocument();
  });
});
