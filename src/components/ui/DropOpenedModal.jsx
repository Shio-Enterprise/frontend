import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAccessToken } from '../../lib/authToken';
import { getUnseenOpenDrops, markWaitlistEntrySeen } from '../../lib/dropWaitlistApi';

/**
 * Modal de aviso de abertura de drop para usuários na lista de espera.
 * Aparece ao abrir a plataforma quando o usuário logado tem drops abertos
 * que ainda não foram vistos. Ao fechar, marca a entrada como vista via API.
 *
 * Nota: usa `seen_at` (campo do modal) — não o `notified_at` do e-mail.
 */
const DropOpenedModal = () => {
  const [entries, setEntries] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    // Só carrega para usuário logado
    if (!getAccessToken()) return;

    let cancelled = false;
    getUnseenOpenDrops()
      .then((results) => {
        if (!cancelled && results.length > 0) {
          setEntries(results);
          setIsOpen(true);
        }
      })
      .catch(() => {
        // Silencia erros: o modal é opcional e não deve quebrar a página
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleClose = useCallback(async () => {
    const current = entries[currentIndex];
    if (current) {
      try {
        await markWaitlistEntrySeen(current.id);
      } catch {
        // Ignora falhas silenciosamente — o modal fecha de qualquer forma
      }
    }

    const next = currentIndex + 1;
    if (next < entries.length) {
      // Avança para o próximo drop não visto
      setCurrentIndex(next);
    } else {
      setIsOpen(false);
    }
  }, [entries, currentIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen || entries.length === 0) return null;

  const current = entries[currentIndex];
  const drop = current?.drop;
  const total = entries.length;
  const position = currentIndex + 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drop-opened-modal-title"
        tabIndex={-1}
        className="relative w-full max-w-md overflow-hidden rounded-xl shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 text-white/70 transition-colors hover:text-white"
          aria-label="Fechar"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="h-32 w-full bg-black flex items-center justify-center rounded-t-xl">
          <span className="text-3xl font-black uppercase tracking-widest text-white">SHIO</span>
        </div>

        <div className="bg-white p-8 text-center">
          {total > 1 && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-shio-muted">
              {position} de {total}
            </p>
          )}
          <h2 id="drop-opened-modal-title" className="mb-2 text-2xl font-black uppercase text-black">
            O Drop abriu! 🎉
          </h2>
          <p className="mb-6 text-black/70">
            O <strong className="text-black">{drop?.name}</strong> que você estava esperando já está disponível. Corre lá!
          </p>

          <Link
            to={`/drop/${drop?.slug}`}
            onClick={handleClose}
            className="block w-full rounded-md bg-black py-4 text-[15px] font-bold uppercase text-white transition-colors hover:bg-black/80"
          >
            Ver o Drop
          </Link>

          <button
            onClick={handleClose}
            className="mt-4 text-sm text-shio-muted hover:text-black hover:underline"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default DropOpenedModal;
