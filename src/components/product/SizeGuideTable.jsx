import { useState } from 'react';
import { formatRange, recommendSize } from '../../lib/sizeGuide';

const HOW_TO_MEASURE = {
  chest: 'Passe a fita na parte mais larga do peito, por baixo dos braços.',
  waist: 'Meça a parte mais fina do tronco, na altura do umbigo.',
  hip: 'Meça a parte mais larga do quadril, passando pelo bumbum.',
};

const resultText = ({ status, size }) => {
  if (status === 'below') return `Sua medida é menor que a do tamanho ${size}, o menor da tabela. O ${size} é o mais próximo.`;
  if (status === 'above') return `Sua medida é maior que a do tamanho ${size}, o maior da tabela. O ${size} é o mais próximo.`;
  return `Seu tamanho é ${size}.`;
};

export default function SizeGuideTable({ guide, id }) {
  const [measureKey, setMeasureKey] = useState(guide.columns[0].key);
  const [value, setValue] = useState('');
  const result = recommendSize(guide, measureKey, value);

  return (
    <section id={id} aria-labelledby="size-guide-title" className="mx-auto max-w-[1240px] scroll-mt-24 border-t border-black/10 px-6 py-16">
      <h2 id="size-guide-title" className="text-[28px] font-black text-black">Tabela de medidas</h2>
      <p className="mt-2 text-[14px] text-black/55">Medidas do corpo, em centímetros. Entre dois tamanhos, escolha o maior.</p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[15px]">
            <caption className="sr-only">Medidas do corpo em centímetros por tamanho</caption>
            <thead>
              <tr className="border-b border-black/10 text-black/55">
                <th scope="col" className="py-3 pr-6 font-medium">Tamanho</th>
                {guide.columns.map((column) => (
                  <th key={column.key} scope="col" className="py-3 pr-6 font-medium">{column.label} (cm)</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guide.rows.map((row) => (
                <tr key={row.size} className={`border-b border-black/5 ${result?.size === row.size ? 'bg-[#f0f0f0]' : ''}`}>
                  <th scope="row" className="py-3 pr-6 font-semibold text-black">{row.size}</th>
                  {guide.columns.map((column) => (
                    <td key={column.key} className="py-3 pr-6 text-black/75">{formatRange(row.measures?.[column.key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-[18px] bg-[#f0f0f0] p-6">
          <h3 className="text-[16px] font-semibold text-black">Descubra seu tamanho</h3>
          <label className="mt-4 block text-[13px] text-black/55">
            Medida
            <select
              value={measureKey}
              onChange={(event) => setMeasureKey(event.target.value)}
              className="mt-1 h-11 w-full rounded-full bg-white px-4 text-sm text-black outline-none"
            >
              {guide.columns.map((column) => (
                <option key={column.key} value={column.key}>{column.label}</option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-[13px] text-black/55">
            Sua medida (cm)
            <input
              type="number"
              inputMode="decimal"
              min="1"
              step="0.5"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="mt-1 h-11 w-full rounded-full bg-white px-4 text-sm text-black outline-none"
            />
          </label>
          <p role="status" className="mt-4 min-h-[20px] text-[14px] font-semibold text-black">
            {result ? resultText(result) : ''}
          </p>
          {HOW_TO_MEASURE[measureKey] && (
            <p className="mt-1 text-[13px] text-black/55">Como medir: {HOW_TO_MEASURE[measureKey]}</p>
          )}
        </div>
      </div>
    </section>
  );
}
