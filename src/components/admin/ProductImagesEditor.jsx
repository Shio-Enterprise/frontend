import { useRef, useState } from 'react';
import { Icon } from '../ui/ShioDesign';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp';
const actionClass = 'inline-flex min-h-11 items-center gap-1 rounded-full border border-black/25 px-4 text-[13px] font-semibold text-black transition hover:border-black aria-disabled:cursor-not-allowed aria-disabled:opacity-40';

// Lista editável das imagens do produto. As mudanças ficam só na tela até o
// formulário ser salvo (como o banner no Editar Drop). A primeira é a principal.
export default function ProductImagesEditor({ images, onChange, onRemoveExisting }) {
  const addInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const replaceKeyRef = useRef(null);
  const addButtonRef = useRef(null);
  const buttonsRef = useRef({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  const buttonRef = (key, action) => (el) => { buttonsRef.current[`${key}:${action}`] = el; };
  // A linha muda de lugar na lista: o foco volta para o mesmo botão dela.
  const focusLater = (key, action) => setTimeout(() => buttonsRef.current[`${key}:${action}`]?.focus());

  const keepValid = (files) => {
    const valid = files.filter((file) => file.size <= MAX_BYTES);
    const oversized = files.length - valid.length;
    setError(oversized > 0 ? `${oversized} imagem(ns) ignorada(s) por exceder 5MB.` : null);
    return valid;
  };

  const handleAdd = (event) => {
    const valid = keepValid(Array.from(event.target.files));
    event.target.value = '';
    if (!valid.length) return;
    const added = valid.map((file) => {
      const preview = URL.createObjectURL(file);
      return { key: preview, file, preview };
    });
    onChange([...images, ...added]);
    setMessage(`${added.length} imagem(ns) adicionada(s). Salve para enviar.`);
  };

  const startReplace = (key) => {
    replaceKeyRef.current = key;
    replaceInputRef.current?.click();
  };

  const handleReplace = (event) => {
    const [file] = keepValid(Array.from(event.target.files).slice(0, 1));
    event.target.value = '';
    const key = replaceKeyRef.current;
    if (!file || !key) return;
    const target = images.find((item) => item.key === key);
    if (target?.preview) URL.revokeObjectURL(target.preview);
    const preview = URL.createObjectURL(file);
    onChange(images.map((item) => (item.key === key ? { ...item, file, preview } : item)));
    setMessage('Imagem substituída. Salve para enviar.');
    focusLater(key, 'replace');
  };

  const move = (index, to, action) => {
    if (to < 0 || to >= images.length || to === index) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.splice(to, 0, item);
    onChange(next);
    setMessage(to === 0 ? 'A imagem agora é a principal.' : `Imagem movida para a posição ${to + 1}.`);
    focusLater(item.key, action);
  };

  const remove = (index) => {
    const item = images[index];
    if (item.preview) URL.revokeObjectURL(item.preview);
    if (item.id) onRemoveExisting(item.id);
    onChange(images.filter((_, i) => i !== index));
    setMessage(`Imagem ${index + 1} removida. Salve para confirmar.`);
    // O botão clicado some: o foco vai para "Adicionar imagens".
    setTimeout(() => addButtonRef.current?.focus());
  };

  return (
    <div>
      <span className="text-[15px] uppercase text-shio-muted">Imagens (Opcional)</span>
      <p className="mt-1 text-[13px] text-shio-muted">A primeira é a principal (capa na loja). As mudanças só valem ao salvar.</p>
      {/* Escondidos de verdade: os botões abrem o seletor de arquivo. */}
      <input ref={addInputRef} type="file" accept={ACCEPT} multiple hidden onChange={handleAdd} />
      <input ref={replaceInputRef} type="file" accept={ACCEPT} hidden onChange={handleReplace} />

      {images.length > 0 && (
        <ol aria-label="Imagens do produto" className="mt-3 grid gap-3">
          {images.map((item, index) => {
            const n = index + 1;
            const first = index === 0;
            const last = index === images.length - 1;
            const status = item.file ? (item.id ? 'Substituída' : 'Nova') : null;
            return (
              <li key={item.key} className="flex flex-wrap items-start gap-4 rounded-[18px] border border-black/15 p-3">
                <img
                  src={item.preview ?? item.url}
                  alt={`Imagem ${n}${first ? ' (principal)' : ''}${status ? `, ${status.toLowerCase()}` : ''}`}
                  className="h-20 w-20 shrink-0 rounded-[10px] bg-[#f0f0f0] object-cover"
                />
                <div className="min-w-0 flex-1 basis-48">
                  <p className="text-[14px] font-semibold text-black">
                    Imagem {n}
                    {first && <span className="ml-2 rounded-full bg-black px-2 py-0.5 text-[12px] font-bold uppercase text-white">Principal</span>}
                  </p>
                  {status && <p className="break-all text-[13px] text-shio-muted">{status}: {item.file.name} (enviada ao salvar)</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" ref={buttonRef(item.key, 'up')} aria-disabled={first || undefined} aria-label={`Subir imagem ${n}`} className={actionClass} onClick={() => move(index, index - 1, 'up')}>
                      <span aria-hidden="true">↑</span> Subir
                    </button>
                    <button type="button" ref={buttonRef(item.key, 'down')} aria-disabled={last || undefined} aria-label={`Descer imagem ${n}`} className={actionClass} onClick={() => move(index, index + 1, 'down')}>
                      <span aria-hidden="true">↓</span> Descer
                    </button>
                    <button type="button" ref={buttonRef(item.key, 'principal')} aria-disabled={first || undefined} aria-label={`Tornar principal a imagem ${n}`} className={actionClass} onClick={() => move(index, 0, 'principal')}>
                      Tornar principal
                    </button>
                    <button type="button" ref={buttonRef(item.key, 'replace')} aria-label={`Substituir imagem ${n}`} className={actionClass} onClick={() => startReplace(item.key)}>
                      Substituir
                    </button>
                    <button type="button" aria-label={`Remover imagem ${n}`} className={`${actionClass} text-shio-danger`} onClick={() => remove(index)}>
                      Remover
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <button
        ref={addButtonRef}
        type="button"
        onClick={() => addInputRef.current?.click()}
        className="mt-3 flex h-[88px] w-full items-center justify-center gap-3 rounded-[18px] border border-dashed border-black/25 text-[15px] text-shio-muted transition hover:border-black/50 hover:text-black/65"
      >
        <Icon name="plus" className="h-5 w-5" />
        Adicionar imagens
      </button>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-shio-danger">{error}</p>}
      <p role="status" className="sr-only">{message}</p>
    </div>
  );
}
