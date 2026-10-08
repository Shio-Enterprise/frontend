import { FIT_OPTIONS } from '../../lib/reviewLabels';
import { Rating } from '../ui/ShioDesign';

const STARS = [5, 4, 3, 2, 1];

const plural = (n) => (n === 1 ? '1 avaliação' : `${n} avaliações`);
const starLabel = (n) => (n === 1 ? '1 estrela' : `${n} estrelas`);
const percent = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

function Bar({ label, value, total, ariaLabel }) {
  return (
    <li aria-label={ariaLabel} className="grid grid-cols-[80px_1fr_32px] items-center gap-3 text-[13px] text-black/60">
      <span aria-hidden="true">{label}</span>
      <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-black/10">
        <span className="block h-full rounded-full bg-[#ffc633]" style={{ width: `${percent(value, total)}%` }} />
      </span>
      <span aria-hidden="true" className="text-right">{value}</span>
    </li>
  );
}

export default function ReviewSummary({ summary }) {
  const fitCount = (value) => summary.fit?.[value] ?? 0;
  const fitTotal = FIT_OPTIONS.reduce((sum, option) => sum + fitCount(option.value), 0);

  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr_1fr]">
      <div>
        <Rating value={summary.rating_avg} />
        <p className="mt-2 text-[13px] text-black/50">{plural(summary.rating_count)}</p>
      </div>

      <ul className="grid gap-2" aria-label="Distribuição das notas">
        {STARS.map((star) => {
          const count = summary.distribution?.[star] ?? 0;
          return (
            <Bar
              key={star}
              label={starLabel(star)}
              value={count}
              total={summary.rating_count}
              ariaLabel={`${starLabel(star)}: ${plural(count)}`}
            />
          );
        })}
      </ul>

      {fitTotal > 0 && (
        <div>
          <p className="mb-2 text-[14px] font-semibold text-black">Caimento</p>
          <ul className="grid gap-2">
            {FIT_OPTIONS.map((option) => (
              <Bar
                key={option.value}
                label={option.label}
                value={fitCount(option.value)}
                total={fitTotal}
                ariaLabel={`${option.label}: ${fitCount(option.value)}`}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
