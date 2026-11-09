import { useCallback, useEffect, useRef, useState } from 'react';

const GAP = 16; // gap-4 entre miniaturas

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
  const stripRef = useRef(null);

  const current = images[active]?.image ?? null;
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

  const step = (dir) => {
    const el = stripRef.current;
    if (!el) return;
    const vertical = el.scrollHeight - el.clientHeight >= el.scrollWidth - el.clientWidth;
    const thumb = el.firstElementChild;
    const size = (vertical ? thumb?.offsetHeight : thumb?.offsetWidth) || 100;
    const delta = dir * (size + GAP);
    el.scrollBy(vertical ? { top: delta, behavior: 'smooth' } : { left: delta, behavior: 'smooth' });
  };

  const mainPhoto = (
    <div className="aspect-square w-full overflow-hidden rounded-[8px] bg-[#f0efed]">
      {current && <img src={current} alt={productName} className="h-full w-full object-contain" />}
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
                <img src={img.image} alt="" onLoad={measure} className="h-full w-full object-contain" />
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
