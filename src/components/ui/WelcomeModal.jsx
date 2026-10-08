import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/logo/logo.svg';
import { getAccessToken } from '../../lib/authToken';

const WelcomeModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    const modalClosedAt = localStorage.getItem('welcomeModalClosedAt');
    const token = getAccessToken();

    let shouldShow = false;

    if (!token) {
      if (!modalClosedAt) {
        shouldShow = true;
      } else {
        const closedTime = parseInt(modalClosedAt, 10);
        const oneDayInMs = 1 * 24 * 60 * 60 * 1000;

        if (Date.now() - closedTime > oneDayInMs) {
          shouldShow = true;
        }
      }
    }

    if (shouldShow) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
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

  const handleClose = useCallback(() => {
    setIsOpen(false);
    localStorage.setItem('welcomeModalClosedAt', Date.now().toString());
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
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
          <img
            src={logo}
            alt="Shio Logo"
            className="h-25 w-auto brightness-0 invert"
          />
        </div>

        <div className="bg-white p-8 text-center">
          <h2 id="welcome-modal-title" className="mb-2 text-2xl font-black uppercase text-black">
            Seja muito bem-vindo(a)!
          </h2>
          <p className="mb-6 text-black/70">
            Garanta <strong className="whitespace-nowrap text-black">10% OFF</strong> na sua primeira compra ao se <strong className="text-black">cadastrar</strong> agora. O desconto é aplicado automaticamente no carrinho!
          </p>

          <Link
            to="/signup"
            onClick={handleClose}
            className="block w-full rounded-md bg-black py-4 text-[15px] font-bold uppercase text-white transition-colors hover:bg-black/80"
          >
            Quero meu Desconto
          </Link>

          <button
            onClick={handleClose}
            className="mt-4 text-sm text-black/50 hover:text-black hover:underline"
          >
            Continuar navegando
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
