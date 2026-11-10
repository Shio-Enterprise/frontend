import { useId, useRef } from 'react';
import { Icon } from '../ui/ShioDesign';
import { sizeOptionsFor } from './productForm';
import { newVariationRow, needsStockNote, stockDelta, stockEditable, variationLabel } from './productVariations';

const fieldClass = 'mt-2 h-11 w-full rounded-full border border-black/25 bg-white px-5 text-[15px] outline-none focus:border-black';
const actionClass = 'inline-flex min-h-11 items-center rounded-full border border-black/25 px-4 text-[13px] font-semibold text-black transition hover:border-black';

const deltaText = (row) => {
  const delta = stockDelta(row);
  if (delta === null) return 'Informe um número inteiro, 0 ou mais.';
  if (delta > 0) return `Atual: ${row.current} un. · +${delta} un. (entrada por ajuste)`;
  if (delta < 0) return `Atual: ${row.current} un. · −${-delta} un. (saída por ajuste)`;
  return `Atual: ${row.current} un. · sem mudança`;
};

// Tamanhos e estoque do produto. Como as imagens, tudo fica só na tela até salvar.
export default function ProductVariationsEditor({ rows, onChange, note, onNoteChange }) {
  const baseId = useId();
  const addButtonRef = useRef(null);
  const elementsRef = useRef({});

  const elementRef = (key, name) => (el) => { elementsRef.current[`${key}:${name}`] = el; };
  // O botão clicado é trocado por outro (Remover ⇄ Desfazer): o foco vai para o novo.
  const focusLater = (key, name) => setTimeout(() => elementsRef.current[`${key}:${name}`]?.focus());

  const update = (key, patch) => onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const addRow = () => {
    const row = newVariationRow();
    onChange([...rows, row]);
    focusLater(row.key, 'size');
  };

  const dropNewRow = (key) => {
    onChange(rows.filter((row) => row.key !== key));
    setTimeout(() => addButtonRef.current?.focus());
  };

  const noteNeeded = needsStockNote(rows);
  // Número de cada linha nova ("Novo tamanho 1, 2…"), para os nomes dos campos.
  const newNumbers = new Map(rows.filter((row) => !row.id).map((row, index) => [row.key, index + 1]));

  return (
    <fieldset className="grid gap-3">
      <legend className="text-[15px] uppercase text-shio-muted">Tamanhos e estoque</legend>
      <p className="text-[13px] text-shio-muted">
        Informe a quantidade final de cada tamanho: a diferença entra no histórico como ajuste. Tamanho com pedidos ou
        movimentações é desativado em vez de apagado (some da loja, mas os pedidos antigos continuam mostrando).
      </p>

      <ol aria-label="Tamanhos do produto" className="grid gap-3">
        {rows.map((row) => {
          const id = `${baseId}-${row.key}`;
          if (!row.id) {
            const n = newNumbers.get(row.key);
            return (
              <li key={row.key} className="grid gap-3 rounded-[18px] border border-dashed border-black/30 p-4">
                <p className="text-[14px] font-semibold text-black">Novo tamanho {n} <span className="font-normal text-shio-muted">(criado ao salvar)</span></p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-[13px] text-shio-muted">Tamanho
                    <select ref={elementRef(row.key, 'size')} aria-label={`Tamanho do novo tamanho ${n}`} required value={row.size} onChange={(e) => update(row.key, { size: e.target.value })} className={fieldClass}>
                      {!row.size && <option value="">Selecione</option>}
                      {sizeOptionsFor(row.size).map((size) => <option key={size} value={size}>{size}</option>)}
                    </select>
                  </label>
                  <label className="text-[13px] text-shio-muted">Cor
                    <input aria-label={`Cor do novo tamanho ${n}`} placeholder="#RRGGBB ou nome" value={row.color} onChange={(e) => update(row.key, { color: e.target.value })} className={fieldClass} />
                  </label>
                  <label className="text-[13px] text-shio-muted">SKU (opcional)
                    <input aria-label={`SKU (opcional) do novo tamanho ${n}`} maxLength={100} placeholder="Automático se vazio" value={row.sku} onChange={(e) => update(row.key, { sku: e.target.value.toUpperCase() })} className={fieldClass} />
                  </label>
                  <label className="text-[13px] text-shio-muted">Estoque inicial
                    <input aria-label={`Estoque inicial do novo tamanho ${n}`} type="number" min="0" step="1" value={row.final} onChange={(e) => update(row.key, { final: e.target.value })} className={fieldClass} />
                  </label>
                </div>
                <div>
                  <button type="button" aria-label={`Remover novo tamanho ${n}`} className={`${actionClass} text-shio-danger`} onClick={() => dropNewRow(row.key)}>Remover</button>
                </div>
              </li>
            );
          }

          const label = variationLabel(row);
          const inactive = !row.isActive && !row.reactivate;
          return (
            <li key={row.key} className={`grid gap-3 rounded-[18px] border p-4 ${inactive || row.remove ? 'border-dashed border-black/30 bg-[#f9f9f9]' : 'border-black/15'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[15px] font-bold text-black">{label}</p>
                {!row.isActive && <span className="rounded-full bg-black/10 px-2 py-0.5 text-[12px] font-bold uppercase text-black">Inativo</span>}
                <p className="break-all text-[13px] text-shio-muted">SKU {row.sku}</p>
              </div>

              {stockEditable(row) ? (
                <div>
                  <label className="block text-[13px] text-shio-muted">Quantidade final
                    <input
                      aria-label={`Quantidade final de ${label}`}
                      aria-describedby={`${id}-delta`}
                      type="number"
                      min="0"
                      step="1"
                      value={row.final}
                      onChange={(e) => update(row.key, { final: e.target.value })}
                      className={`${fieldClass} sm:max-w-[200px]`}
                    />
                  </label>
                  <p id={`${id}-delta`} className={`mt-1 text-[13px] ${stockDelta(row) === null ? 'text-shio-danger' : 'text-shio-muted'}`}>{deltaText(row)}</p>
                </div>
              ) : (
                <p className="text-[14px] text-black">Estoque: {row.current} un.</p>
              )}

              {row.remove && (
                <p className="text-[13px] font-semibold text-shio-danger">
                  Será removido ao salvar (ou desativado, se tiver histórico).
                  {row.current > 0 && ` O estoque de ${row.current} un. será zerado por ajuste.`}
                </p>
              )}
              {row.reactivate && <p className="text-[13px] font-semibold text-shio-success">Será reativado ao salvar.</p>}

              <div className="flex flex-wrap gap-2">
                {row.isActive && !row.remove && (
                  <button type="button" ref={elementRef(row.key, 'remove')} aria-label={`Remover tamanho ${label}`} className={`${actionClass} text-shio-danger`}
                    onClick={() => { update(row.key, { remove: true }); focusLater(row.key, 'undo'); }}>
                    Remover
                  </button>
                )}
                {!row.isActive && !row.reactivate && (
                  <button type="button" ref={elementRef(row.key, 'reactivate')} aria-label={`Reativar tamanho ${label}`} className={actionClass}
                    onClick={() => { update(row.key, { reactivate: true }); focusLater(row.key, 'undo'); }}>
                    Reativar
                  </button>
                )}
                {(row.remove || row.reactivate) && (
                  <button type="button" ref={elementRef(row.key, 'undo')} aria-label={`Desfazer mudança em ${label}`} className={actionClass}
                    onClick={() => {
                      update(row.key, { remove: false, reactivate: false, final: String(row.current) });
                      focusLater(row.key, row.remove ? 'remove' : 'reactivate');
                    }}>
                    Desfazer
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <button
        ref={addButtonRef}
        type="button"
        onClick={addRow}
        className="flex h-[64px] w-full items-center justify-center gap-3 rounded-[18px] border border-dashed border-black/25 text-[15px] text-shio-muted transition hover:border-black/50 hover:text-black/65"
      >
        <Icon name="plus" className="h-5 w-5" />
        Adicionar tamanho
      </button>

      <label className="block">
        <span className="text-[13px] text-shio-muted">
          Justificativa do ajuste de estoque {noteNeeded ? '(obrigatória)' : '(obrigatória se mudar o estoque)'}
        </span>
        <textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          aria-required={noteNeeded || undefined}
          aria-describedby={`${baseId}-note-hint`}
          placeholder="Ex: contagem do estoque físico"
          className="mt-2 min-h-[80px] w-full rounded-[18px] border border-black/25 px-5 py-3 text-[15px] outline-none placeholder:text-shio-placeholder focus:border-black"
        />
      </label>
      <p id={`${baseId}-note-hint`} className="-mt-2 text-[12px] text-shio-muted">Fica registrada no histórico de movimentações.</p>
    </fieldset>
  );
}
