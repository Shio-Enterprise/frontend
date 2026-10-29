import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../../components/ui/ShioDesign';

const palette = ['#171717', '#c59b00', '#2663a7', '#bd473c', '#48845d', '#815aa2', '#3c858b', '#8d6a53'];

export function HorizontalBars({ rows, getKey, getLabel, getValue, formatValue, getHref, onSelect }) {
  if (!rows?.length) return <p className="rounded-lg bg-black/[0.03] px-4 py-6 text-sm text-black/55">Nenhum dado no período.</p>;
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
          <div className="h-full rounded-full bg-black" style={{ width: `${max > 0 ? Math.max(0, value / max * 100) : 0}%` }} />
        </div>
      </div>;
    })}
  </div>;
}

function ringPoint(turn, radius) {
  const radians = (turn * 360 - 90) * Math.PI / 180;
  return [50 + radius * Math.cos(radians), 50 + radius * Math.sin(radians)];
}

function slicePath(start, end) {
  const span = end - start;
  if (span >= 0.999) return null;
  const [x1, y1] = ringPoint(start, 38);
  const [x2, y2] = ringPoint(end, 38);
  const large = span > 0.5 ? 1 : 0;
  return `M ${x1} ${y1} A 38 38 0 ${large} 1 ${x2} ${y2}`;
}

export function DonutChart({ rows, getKey, getLabel, getValue, formatValue, totalLabel, onSelect, showCenter = true, centerText = '100%' }) {
  const [active, setActive] = useState(null);
  const values = rows?.map((row) => Math.max(0, Number(getValue(row)) || 0)) ?? [];
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!total) return <p className="rounded-lg bg-black/[0.03] px-4 py-6 text-sm text-black/55">Nenhum dado no período.</p>;

  const slices = rows.map((row, index) => {
    const start = values.slice(0, index).reduce((sum, value) => sum + value, 0) / total;
    const end = start + values[index] / total;
    return { row, index, start, end, path: slicePath(start, end) };
  });
  const activeSlice = slices.find((slice) => slice.index === active) ?? null;
  const tipAt = activeSlice ? ringPoint(activeSlice.start + (activeSlice.end - activeSlice.start) / 2, 56) : null;
  const keepActive = (index) => setActive((current) => (current === index ? null : current));

  return <div className="grid min-w-0 items-center gap-4 2xl:grid-cols-[160px_minmax(0,1fr)]">
    <div className="relative mx-auto w-full max-w-[180px]" role="group" aria-label={`Gráfico de rosca: ${totalLabel}`}>
      <svg className="h-auto w-full" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="38" fill="none" stroke="#f0f0f0" strokeWidth="18" />
        {slices.map(({ row, index, path }) => {
          const label = `${getLabel(row)}: ${formatValue(row)}`;
          const color = palette[index % palette.length];
          const shared = {
            fill: 'none',
            stroke: color,
            strokeWidth: 18,
            tabIndex: 0,
            'aria-label': label,
            className: 'cursor-pointer outline-none',
            style: { pointerEvents: 'stroke', opacity: active == null || active === index ? 1 : 0.35 },
            onMouseEnter: () => setActive(index),
            onMouseLeave: () => keepActive(index),
            onFocus: () => setActive(index),
            onBlur: () => keepActive(index),
          };
          return path
            ? <path key={getKey(row, index)} {...shared} d={path} />
            : <circle key={getKey(row, index)} {...shared} cx="50" cy="50" r="38" />;
        })}
        {showCenter && (
          <>
            <text x="50" y="48" textAnchor="middle" fontSize="10" fontWeight="700" fill="#171717">Total</text>
            <text x="50" y="59" textAnchor="middle" fontSize="8" fill="#666">{centerText}</text>
          </>
        )}
      </svg>
      {activeSlice && tipAt && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 w-max max-w-[220px] rounded-lg bg-black px-3 py-1.5 text-center text-xs text-white"
          style={{ left: `${tipAt[0]}%`, top: `${tipAt[1]}%`, transform: `translate(-50%, ${tipAt[1] < 50 ? '-120%' : '8px'})` }}
        >
          <span className="block font-semibold">{getLabel(activeSlice.row)}</span>
          <span className="text-white/75">
            {formatValue(activeSlice.row)} ({(values[activeSlice.index] / total * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)
          </span>
        </div>
      )}
    </div>
    <div className="min-w-0 space-y-2" role="list">
      {rows.map((row, index) => <div key={getKey(row, index)} role="listitem" className={`flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md px-1 text-sm ${active === index ? 'bg-black/[0.04]' : ''}`} onMouseEnter={() => setActive(index)} onMouseLeave={() => keepActive(index)}>
        <span className="flex min-w-0 items-center gap-2 [overflow-wrap:anywhere]"><span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: palette[index % palette.length] }} /><span className="min-w-0">{getLabel(row)}</span></span>
        <span className="flex min-w-0 items-center gap-2 font-semibold [overflow-wrap:anywhere]"><span>{formatValue(row)} <span className="font-normal text-black/55">({(values[index] / total * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%)</span></span>{onSelect && <button type="button" onClick={() => onSelect(row)} aria-label={`Ver pedidos de ${getLabel(row)}`} title={`Ver pedidos de ${getLabel(row)}`} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/15 hover:bg-black/5"><Icon name="arrowRight" className="h-4 w-4" /></button>}</span>
      </div>)}
    </div>
  </div>;
}
