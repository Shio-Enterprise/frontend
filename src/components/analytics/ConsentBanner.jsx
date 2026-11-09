import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  CONSENT_GRANTED,
  CONSENT_DENIED,
  EVENT_TYPES,
  getAnalyticsConsent,
  setAnalyticsConsent,
  trackEvent,
} from '../../lib/analytics';

// Pede a escolha do visitante uma única vez. Enquanto não houver resposta, nada é rastreado.
const ConsentBanner = () => {
  const [decided, setDecided] = useState(() => getAnalyticsConsent() !== null);
  const { pathname } = useLocation();

  if (decided) return null;

  const decide = (value) => {
    setAnalyticsConsent(value);
    setDecided(true);
    // A página atual foi carregada antes da resposta, então ela é registrada agora, se aceita.
    if (value === CONSENT_GRANTED) trackEvent(EVENT_TYPES.PAGE_VIEW, { path: pathname });
  };

  return (
    <div
      role="dialog"
      aria-labelledby="consent-banner-title"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-2xl rounded-[20px] border border-black/10 bg-white p-6 shadow-lg"
    >
      <h2 id="consent-banner-title" className="mb-2 text-lg font-black uppercase text-black">
        Sua privacidade
      </h2>
      <p className="text-sm text-black/70">
        Usamos registros de navegação (páginas, produtos visualizados, carrinho e compras) para
        entender como a loja é usada e melhorar a experiência. Quando você está logado, esses
        registros ficam associados à sua conta. Se recusar, o site funciona normalmente e nada
        é registrado.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => decide(CONSENT_DENIED)}
          className="rounded-full border border-black/20 px-5 py-2 text-sm font-semibold text-black hover:border-black/50"
        >
          Recusar
        </button>
        <button
          type="button"
          onClick={() => decide(CONSENT_GRANTED)}
          className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-black/80"
        >
          Aceitar
        </button>
      </div>
    </div>
  );
};

export default ConsentBanner;
