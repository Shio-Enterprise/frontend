import { useEffect, useId, useRef } from 'react';
import Dialog from '../ui/Dialog';
import { Icon } from '../ui/ShioDesign';
import { useMediaQuery } from '../../hooks/useMediaQuery';

// Painel lateral não modal (telas largas): deixa a lista usável ao lado, recebe o foco ao
// abrir, fecha com Esc e devolve o foco a quem abriu.
function DesktopDrawer({ titleId, onClose, className, children }) {
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const opener = document.activeElement;
    panelRef.current?.focus();
    // O painel não é modal: a página continua usável ao lado. Para nada focável ficar escondido
    // atrás dele (WCAG 2.4.11), a página encolhe a largura do painel enquanto ele está aberto.
    const { body } = document;
    const previousPadding = body.style.paddingRight;
    body.style.paddingRight = `${panelRef.current?.offsetWidth ?? 0}px`;
    return () => {
      body.style.paddingRight = previousPadding;
      if (opener instanceof HTMLElement && opener !== document.body && opener.isConnected) opener.focus();
    };
  }, []);

  return (
    <aside
      ref={panelRef}
      tabIndex={-1}
      aria-labelledby={titleId}
      className={className}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') return;
        // Esc dentro de um modal aberto pelo painel (ex.: aprovar reembolso) fecha só o modal.
        if (event.target instanceof Element && event.target.closest('[role="dialog"]')) return;
        event.stopPropagation();
        onCloseRef.current();
      }}
    >
      {children}
    </aside>
  );
}

// Classes literais (o Tailwind só gera o que aparece escrito no código).
const WIDTHS = {
  360: { sheet: 'sm:max-w-[360px]', panel: 'w-[360px]' },
  380: { sheet: 'sm:max-w-[380px]', panel: 'w-[380px]' },
};

// Abaixo de 1280px sobra pouca página ao lado do painel (o rodapé e as tabelas ficavam por
// trás dele): ali o painel é modal. No celular cobre a tela; a partir de 640px é uma gaveta à
// direita com fundo escurecido. A partir de 1280px é o painel lateral não modal.
// titleRef: quem usa pode levar o foco ao título depois de uma ação que some com o botão
// que estava focado (#64).
export default function DrawerShell({ title, onClose, width = 360, titleRef, children }) {
  const isDesktop = useMediaQuery('(min-width: 1280px)');
  const titleId = useId();
  const size = WIDTHS[width] ?? WIDTHS[360];
  const content = (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-black/10 py-3 pl-7 pr-4">
        <h2 id={titleId} ref={titleRef} tabIndex={titleRef ? -1 : undefined} className="text-[18px] font-black uppercase tracking-wide">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-black/5">
          <Icon name="close" className="h-5 w-5" />
        </button>
      </div>
      {children}
    </>
  );

  if (isDesktop) {
    return (
      <DesktopDrawer
        titleId={titleId}
        onClose={onClose}
        className={`fixed inset-y-0 right-0 z-30 flex flex-col border-l border-black/10 bg-white shadow-2xl ${size.panel}`}
      >
        {content}
      </DesktopDrawer>
    );
  }
  return (
    <Dialog
      labelledBy={titleId}
      onClose={onClose}
      overlayClassName="bg-black/40"
      className={`ml-auto flex h-full w-full flex-col bg-white shadow-2xl ${size.sheet}`}
    >
      {content}
    </Dialog>
  );
}
