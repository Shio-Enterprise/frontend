import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Diálogos abertos, do mais antigo ao mais novo. Com um modal aberto por cima de outro (ex.:
// aprovar reembolso dentro do painel do pedido no celular), só o de cima responde a Esc e Tab.
const openDialogs = [];

// Modal acessível (#64): anuncia como diálogo, prende o foco, fecha com Esc e devolve o foco
// a quem abriu. O visual do painel fica com quem usa (className/overlayClassName).
export default function Dialog({
  labelledBy,
  onClose,
  closeOnBackdrop = false,
  as: Panel = 'div',
  className = '',
  overlayClassName = 'bg-black/40 px-4',
  children,
  ...panelProps
}) {
  const panelRef = useRef(null);
  const tokenRef = useRef({});

  useEffect(() => {
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    const token = tokenRef.current;
    openDialogs.push(token);
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      openDialogs.splice(openDialogs.indexOf(token), 1);
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && opener !== document.body && opener.isConnected) {
        opener.focus();
        return;
      }
      // Modal aberto sozinho (sem botão de origem): o foco volta ao início da página, senão o
      // próximo Tab continua de onde o modal estava e pula o menu.
      const { body } = document;
      body.setAttribute('tabindex', '-1');
      body.focus();
      body.addEventListener('blur', () => body.removeAttribute('tabindex'), { once: true });
    };
  }, []);

  // No document, e não no painel: se um clique tirar o foco do modal, Esc e Tab continuam valendo.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (openDialogs[openDialogs.length - 1] !== tokenRef.current) return;
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      const focusables = [...panel.querySelectorAll(FOCUSABLE)];
      if (focusables.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (!panel.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      data-testid="dialog-backdrop"
      className={`fixed inset-0 z-50 flex items-center justify-center ${overlayClassName}`}
      onMouseDown={(event) => {
        // Sem isso, o clique na área escura move o foco para a página por baixo.
        if (event.target === event.currentTarget) event.preventDefault();
      }}
      onClick={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      {Panel === 'form' ? (
        // role="dialog" não é permitido em <form> (ARIA): o diálogo é a div e o form fica dentro,
        // com display: contents para não mudar o layout de quem usa.
        <div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={labelledBy} className={className}>
          <form className="contents" {...panelProps}>{children}</form>
        </div>
      ) : (
        <Panel
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          className={className}
          {...panelProps}
        >
          {children}
        </Panel>
      )}
    </div>
  );
}
