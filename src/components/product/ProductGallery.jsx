import { useCallback, useEffect, useRef, useState } from 'react';

const GAP = 16; // gap-4 entre miniaturas

const prefersReducedMotion = () => typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Seta da galeria. aria-disabled em vez de disabled: botão desabilitado perde o foco do teclado
// quando a faixa chega ao fim.
const Arrow = ({ label, disabled, onClick, children }) => (
  <button type="button" aria-label={label} aria-disabled={disabled}
    onClick={disabled ? undefined : onClick}
    className={`flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-full bg-white text-black ring-1 ring-black/15 transition ${disabled ? 'cursor-default opacity-30' : 'hover:bg-black hover:text-white'}`}>
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
      {children}
    </svg>
  </button>
);

/**
 * Galeria da página do produto (#84): foto principal sempre quadrada e inteira (sem corte),
 * miniaturas quadradas numa coluna da mesma altura (computador) ou numa linha abaixo (celular),
 * com setas quando não cabem. Com uma foto só, não há miniaturas.
 */
const ProductGallery = ({ images, productName }) => {
  const [active, setActive] = useState(0);
  const [scroll, setScroll] = useState({ overflow: false, atStart: true, atEnd: true });
  const [broken, setBroken] = useState(() => new Set());
  const stripRef = useRef(null);
  // Destino da rolagem em andamento: cliques seguidos somam a partir dele, não da posição atual
  // (que ainda está no meio da animação).
  const targetRef = useRef(null);

  // Foto que não carrega vira o quadro cinza em vez do ícone de imagem quebrada.
  const markBroken = (id) => setBroken((prev) => new Set(prev).add(id));
  const ok = (img) => img?.image && !broken.has(img.id);
  const current = images[active];
  const hasThumbs = images.length > 1;

  // A faixa rola na vertical no computador e na horizontal no celular (decidido pelo CSS);
  // o eixo que transborda é o que vale.
  const measure = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    const extraY = el.scrollHeight - el.clientHeight;
    const extraX = el.scrollWidth - el.clientWidth;
    const vertical = extraY >= extraX;
    const extra = vertical ? extraY : extraX;
    const pos = vertical ? el.scrollTop : el.scrollLeft;
    if (targetRef.current !== null && Math.abs(pos - targetRef.current) <= 1) targetRef.current = null;
    const next = { overflow: extra > 1, atStart: pos <= 1, atEnd: pos >= extra - 1 };
    setScroll((prev) => (
      prev.overflow === next.overflow && prev.atStart === next.atStart && prev.atEnd === next.atEnd ? prev : next
    ));
  }, []);

  useEffect(() => {
    measure();
    if (typeof ResizeObserver === 'undefined' || !stripRef.current) return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(stripRef.current);
    return () => ro.disconnect();
  }, [measure, images.length]);

  // Rolagem terminou, ou a pessoa rolou por conta própria: esquece o destino guardado.
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return undefined;
    const forget = () => { targetRef.current = null; };
    const events = ['scrollend', 'wheel', 'touchstart'];
    events.forEach((e) => el.addEventListener(e, forget, { passive: true }));
    return () => events.forEach((e) => el.removeEventListener(e, forget));
  }, [images.length]);

  const step = (dir) => {
    const el = stripRef.current;
    if (!el) return;
    const vertical = el.scrollHeight - el.clientHeight >= el.scrollWidth - el.clientWidth;
    const thumb = el.firstElementChild;
    const size = (vertical ? thumb?.offsetHeight : thumb?.offsetWidth) || 100;
    const pos = vertical ? el.scrollTop : el.scrollLeft;
    const max = vertical ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth;
    const from = targetRef.current ?? pos;
    const target = Math.min(max, Math.max(0, from + dir * (size + GAP)));
    targetRef.current = target;
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
    el.scrollTo(vertical ? { top: target, behavior } : { left: target, behavior });
  };

  const mainPhoto = (
    <div className="aspect-square w-full overflow-hidden rounded-[8px] bg-[#f0efed]">
      {ok(current) && (
        <img src={current.image} alt={productName} onError={() => markBroken(current.id)}
          className="h-full w-full object-contain" />
      )}
    </div>
  );

  // Limita a largura no tablet (página em uma coluna) para a foto não passar da altura da tela.
  const frame = 'mx-auto w-full max-w-[570px]';

  if (!hasThumbs) return <div className={frame}>{mainPhoto}</div>;

  return (
    <div className={`${frame} grid grid-cols-1 gap-4 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-5`}>
      <div className="sm:order-2">{mainPhoto}</div>

      {/* No computador a coluna fica "fora do fluxo" (absolute) para ter exatamente a altura da foto. */}
      <div className="relative sm:order-1">
        <div className="flex items-center gap-2 sm:absolute sm:inset-0 sm:flex-col">
          {scroll.overflow && (
            <Arrow label="Fotos anteriores" disabled={scroll.atStart} onClick={() => step(-1)}>
              <path d="M15 6l-6 6 6 6" className="sm:hidden" />
              <path d="M6 15l6-6 6 6" className="hidden sm:block" />
            </Arrow>
          )}
          <div ref={stripRef} onScroll={measure} data-testid="faixa-miniaturas"
            role="group" aria-label="Fotos do produto"
            className="flex min-h-0 min-w-0 flex-1 gap-4 overflow-auto p-0.5 [scrollbar-width:none] sm:w-full sm:flex-col [&::-webkit-scrollbar]:hidden">
            {images.map((img, i) => (
              <button key={img.id} type="button" onClick={() => setActive(i)}
                aria-label={`Ver foto ${i + 1} de ${images.length}`}
                aria-pressed={i === active}
                className={`aspect-square w-20 shrink-0 overflow-hidden rounded-[2px] bg-[#f0efed] ring-2 transition sm:w-full ${i === active ? 'ring-black' : 'ring-transparent hover:ring-black/30'}`}>
                {ok(img) && (
                  <img src={img.image} alt="" onLoad={measure} onError={() => markBroken(img.id)}
                    className="h-full w-full object-contain" />
                )}
              </button>
            ))}
          </div>
          {scroll.overflow && (
            <Arrow label="Próximas fotos" disabled={scroll.atEnd} onClick={() => step(1)}>
              <path d="M9 6l6 6-6 6" className="sm:hidden" />
              <path d="M6 9l6 6 6-6" className="hidden sm:block" />
            </Arrow>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductGallery;
