import { useRef } from 'react';

const VALUES = [1, 2, 3, 4, 5];
const INCREASE_KEYS = ['ArrowRight', 'ArrowUp'];
const DECREASE_KEYS = ['ArrowLeft', 'ArrowDown'];

export default function RatingInput({ value, onChange, label = 'Nota' }) {
  const buttons = useRef([]);
  const tabStop = value ?? 1;

  const select = (next) => {
    const clamped = Math.min(5, Math.max(1, next));
    onChange(clamped);
    buttons.current[clamped - 1]?.focus();
  };

  const handleKeyDown = (event) => {
    if (INCREASE_KEYS.includes(event.key)) {
      event.preventDefault();
      select((value ?? 0) + 1);
    } else if (DECREASE_KEYS.includes(event.key)) {
      event.preventDefault();
      select((value ?? 2) - 1);
    }
  };

  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {VALUES.map((n) => (
        <button
          key={n}
          ref={(element) => {
            buttons.current[n - 1] = element;
          }}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={n === 1 ? '1 estrela' : `${n} estrelas`}
          tabIndex={n === tabStop ? 0 : -1}
          onClick={() => select(n)}
          onKeyDown={handleKeyDown}
          className={`rounded text-[32px] leading-none transition focus:outline-none focus-visible:ring-2 focus-visible:ring-black ${
            value && n <= value ? 'text-[#ffc633]' : 'text-black/15 hover:text-[#ffc633]/60'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
