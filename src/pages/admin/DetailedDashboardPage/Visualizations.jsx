import { Link } from 'react-router-dom';
import { Icon } from '../../../components/ui/ShioDesign';

// Cores das fatias (#64): todas com contraste ≥ 3:1 com o branco (o dourado antigo, #c59b00, tinha
// 2,6:1). Fatias vizinhas são separadas por um vão branco, então cada uma contrasta com o fundo e
// não precisa contrastar com a do lado. A legenda repete nome, valor e porcentagem em texto.
const palette = ['#171717', '#8a6500', '#2663a7', '#bd473c', '#48845d', '#815aa2', '#3c858b', '#8d6a53'];

export function HorizontalBars({ rows, getKey, getLabel, getValue, formatValue, getHref, onSelect }) {
  if (!rows?.length) return <p className="rounded-lg bg-black/[0.03] px-4 py-6 text-sm text-shio-muted">Nenhum dado no período.</p>;
  const max = Math.max(0, ...rows.map((row) => Number(getValue(row)) || 0));

  return <div className="min-w-0 space-y-4" role="list">
    {rows.map((row, index) => {
      const label = getLabel(row);
      const value = Number(getValue(row)) || 0;
      const href = getHref?.(row);
      return <div key={getKey(row, index)} role="listitem">
        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
          {href ? <Link to={href} className="min-w-0 font-medium underline-offset-2 [overflow-wrap:anywhere] hover:underline">{label}</Link> : <span className="min-w-0 font-medium [overflow-wrap:anywhere]">{label}</span>}
          <span className="flex max-w-full items-center gap-2 text-right [overflow-wrap:anywhere]"><strong>{formatValue(row)}</strong>{onSelect && <button type="button" onClick={() => onSelect(row)} aria-label={`Ver pedidos de ${label}`} title={`Ver pedidos de ${label}`} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/15 hover:bg-black/5"><Icon name="arrowRight" className="h-4 w-4" /></button>}</span>
        </div>
        <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-black/[0.07]">
          <div className="h-full rounded-full bg-black forced-colors:bg-[CanvasText]" style={{ width: `${max > 0 ? Math.max(0, value / max * 100) : 0}%` }} />
        </div>
      </div>;
    })}
  </div>;
}

export function DonutChart({ rows, getKey, getLabel, getValue, formatValue, totalLabel, onSelect }) {
  const values = rows?.map((row) => Math.max(0, Number(getValue(row)) || 0)) ?? [];
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!total) return <p className="rounded-lg bg-black/[0.03] px-4 py-6 text-sm text-shio-muted">Nenhum dado no período.</p>;

  return <div className="grid min-w-0 items-center gap-4 2xl:grid-cols-[160px_minmax(0,1fr)]">
    <svg className="mx-auto h-auto w-full max-w-[180px] forced-color-adjust-none" viewBox="0 0 100 100" role="img"
      aria-label={`Gráfico de rosca: ${totalLabel}. Valores e porcentagens na legenda a seguir.`}>
      {rows.map((row, index) => {
        const share = values[index] / total * 100;
        if (!share) return null;
        const offset = values.slice(0, index).reduce((sum, value) => sum + value, 0) / total * 100;
        // Vão branco de 1,5% entre fatias; fatia menor que o vão vira um traço mínimo.
        const gap = share < 100 ? Math.min(1.5, share / 2) : 0;
        return <circle key={getKey(row, index)} cx="50" cy="50" r="38" fill="none"
          stroke={palette[index % palette.length]} strokeWidth="18" pathLength="100"
          strokeDasharray={`${share - gap} ${100 - share + gap}`} strokeDashoffset={-offset}
          transform="rotate(-90 50 50)" />;
      })}
      <text x="50" y="48" textAnchor="middle" fontSize="10" fontWeight="700" fill="#171717">Total</text>
      <text x="50" y="59" textAnchor="middle" fontSize="8" fill="#666">100%</text>
    </svg>
    <div className="min-w-0 space-y-2" role="list">
      {rows.map((row, index) => <div key={getKey(row, index)} role="listitem" className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
        <span className="flex min-w-0 items-center gap-2 [overflow-wrap:anywhere]"><span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm forced-color-adjust-none" style={{ backgroundColor: palette[index % palette.length] }} /><span className="min-w-0">{getLabel(row)}</span></span>
        <span className="flex min-w-0 items-center gap-2 font-semibold [overflow-wrap:anywhere]"><span>{formatValue(row)} <span className="font-normal text-shio-muted">({(values[index] / total * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)</span></span>{onSelect && <button type="button" onClick={() => onSelect(row)} aria-label={`Ver pedidos de ${getLabel(row)}`} title={`Ver pedidos de ${getLabel(row)}`} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/15 hover:bg-black/5"><Icon name="arrowRight" className="h-4 w-4" /></button>}</span>
      </div>)}
    </div>
  </div>;
}
