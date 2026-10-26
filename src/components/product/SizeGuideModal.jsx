import { useEffect, useRef, useState } from 'react';
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

export default function SizeGuideModal({ guide, productName, onClose }) {
  const dialogRef = useRef(null);
  const [measureKey, setMeasureKey] = useState(guide.columns[0].key);
  const [value, setValue] = useState('');
  const result = recommendSize(guide, measureKey, value);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-guide-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[18px] bg-white p-6 outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="size-guide-title" className="text-[20px] font-bold text-black">Guia de medidas</h2>
            {productName && <p className="mt-1 text-[14px] text-black/55">{productName}</p>}
          </div>
          <button type="button" onClick={onClose} className="text-[13px] font-semibold text-black/60 hover:text-black">
            Fechar
          </button>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-[14px]">
            <caption className="sr-only">Medidas do corpo em centímetros por tamanho</caption>
            <thead>
              <tr className="border-b border-black/10 text-black/55">
                <th scope="col" className="py-2 pr-4 font-medium">Tamanho</th>
                {guide.columns.map((column) => (
                  <th key={column.key} scope="col" className="py-2 pr-4 font-medium">{column.label} (cm)</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guide.rows.map((row) => (
                <tr key={row.size} className={`border-b border-black/5 ${result?.size === row.size ? 'bg-[#f0f0f0]' : ''}`}>
                  <th scope="row" className="py-2 pr-4 font-semibold text-black">{row.size}</th>
                  {guide.columns.map((column) => (
                    <td key={column.key} className="py-2 pr-4 text-black/75">{formatRange(row.measures[column.key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 border-t border-black/10 pt-5">
          <h3 className="text-[15px] font-semibold text-black">Descubra seu tamanho</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-[13px] text-black/55">
              Medida
              <select
                value={measureKey}
                onChange={(event) => setMeasureKey(event.target.value)}
                className="mt-1 h-11 w-full rounded-full bg-[#f0f0f0] px-4 text-sm text-black outline-none"
              >
                {guide.columns.map((column) => (
                  <option key={column.key} value={column.key}>{column.label}</option>
                ))}
              </select>
            </label>
            <label className="text-[13px] text-black/55">
              Sua medida (cm)
              <input
                type="number"
                inputMode="decimal"
                min="1"
                step="0.5"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className="mt-1 h-11 w-full rounded-full bg-[#f0f0f0] px-4 text-sm text-black outline-none"
              />
            </label>
          </div>
          <p role="status" className="mt-3 min-h-[20px] text-[14px] font-semibold text-black">
            {result ? resultText(result) : ''}
          </p>
          {HOW_TO_MEASURE[measureKey] && (
            <p className="mt-1 text-[13px] text-black/55">Como medir: {HOW_TO_MEASURE[measureKey]}</p>
          )}
        </div>

        <p className="mt-5 text-[12px] text-black/45">
          Medidas do corpo, não da peça. Entre dois tamanhos, escolha o maior.
        </p>
      </div>
    </div>
  );
}
