import { variationLabel } from '../../lib/exchanges';

export default function ExchangeItemsList({ items }) {
  return (
    <ul className="space-y-1 text-[13px] text-black/70">
      {items.map((item) => (
        <li key={item.id}>
          {item.quantity}× {item.product_name}: {variationLabel(item.variation)}
          {' → '}
          <strong className="text-black">{variationLabel(item.replacement_variation)}</strong>
          {item.condition_label && <span className="text-black/45"> ({item.condition_label})</span>}
        </li>
      ))}
    </ul>
  );
}
