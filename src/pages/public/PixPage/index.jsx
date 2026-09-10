import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import PublicLayout from '../../../components/layout/public/PublicLayout';
import { Icon, PageMarker } from '../../../components/ui/ShioDesign';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const EXPIRY_SECONDS = 30 * 60; // 30 minutes

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const PixPage = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const orderNsu = searchParams.get('order_nsu');
  const transactionNsu = searchParams.get('transaction_nsu');
  const slug = searchParams.get('slug');

  // Data passed via navigation state (from PaymentPage)
  const navState = location.state ?? {};
  const orderNumber = navState.orderNumber ?? orderNsu ?? '—';
  const total = navState.total ?? null;
  const paymentLabel = navState.paymentMethod === 'card' ? 'Cartão' : 'PIX';

  const [status, setStatus] = useState('loading'); // loading | confirmed | error
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(EXPIRY_SECONDS);
  const intervalRef = useRef(null);

  // Countdown timer (starts when confirmed)
  useEffect(() => {
    if (status !== 'confirmed') return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(intervalRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [status]);

  useEffect(() => {
    // No params → treat as confirmed (came from PaymentPage directly)
    if (!orderNsu || !transactionNsu || !slug) {
      setStatus('confirmed');
      return;
    }

    // Test mode
    if (orderNsu.startsWith('TESTE-')) {
      setStatus('confirmed');
      return;
    }

    fetch(`${API_BASE_URL}/api/orders/pagamento-sucesso/?order_nsu=${orderNsu}&transaction_nsu=${transactionNsu}&slug=${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.message?.toLowerCase().includes('erro') || data.message?.toLowerCase().includes('fail')) {
          setStatus('error');
        } else {
          setStatus('confirmed');
        }
      })
      .catch(() => setStatus('error'));
  }, [orderNsu, transactionNsu, slug]);

  const handleCopy = () => {
    navigator.clipboard.writeText('00020126580014BR.GOV.BCB.PIX01361234-5678-9012-FAKE-CODE-FOR-DEMO').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (status === 'loading') {
    return (
      <PublicLayout>
        <PageMarker name="PixPage" />
        <section className="mx-auto max-w-[480px] px-4 py-20 text-center">
          <p className="text-[16px] text-black/45">Verificando pagamento...</p>
        </section>
      </PublicLayout>
    );
  }

  if (status === 'error') {
    return (
      <PublicLayout>
        <PageMarker name="PixPage" />
        <section className="mx-auto max-w-[480px] px-4 py-10">
          <div className="rounded-[20px] border border-black/10 px-6 py-10 text-center">
            {/* Error icon */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
              <span className="text-[28px] text-[#cc0000]">✕</span>
            </div>

            <h2 className="mt-5 text-[20px] font-black uppercase tracking-wider text-[#cc0000]">
              Erro ao finalizar o pagamento!
            </h2>
            <p className="mx-auto mt-3 max-w-xs text-[14px] leading-relaxed text-black/55">
              Houve um erro ao processar o seu pagamento. Tente novamente ou selecione outra forma de pagamento.
            </p>

            <div className="mt-8 space-y-3">
              <button onClick={() => setStatus('loading')}
                className="h-12 w-full rounded-full bg-black text-[13px] font-bold uppercase tracking-widest text-white transition hover:bg-black/85">
                Tente Novamente
              </button>
              <Link to="/payment"
                className="flex h-12 w-full items-center justify-center rounded-full border border-black/20 text-[13px] font-bold uppercase tracking-widest text-black transition hover:border-black">
                Selecione Outra Forma de Pagamento
              </Link>
            </div>
          </div>
        </section>
      </PublicLayout>
    );
  }

  // ── Confirmed / pending payment state ──
  return (
    <PublicLayout>
      <PageMarker name="PixPage" />
      <section className="mx-auto max-w-[480px] px-4 py-10">
        <div className="rounded-[20px] border border-black/10 px-6 py-8">

          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e6f9ed]">
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-[#10a545]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" fill="#e6f9ed" stroke="#10a545"/>
                <path d="M7 12.5l3.5 3.5 6-7"/>
              </svg>
            </div>
            <h2 className="mt-4 text-[20px] font-black uppercase tracking-wider text-[#10a545]">
              Pedido Confirmado!
            </h2>
            <p className="mt-2 text-[13px] text-black/50">
              Guarde o número do pedido para acompanhar o status em Meus Pedidos.
            </p>
          </div>

          {/* Order card */}
          <div className="mt-6 rounded-[12px] bg-[#f7f7f7] p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] text-black/45">Número do pedido</p>
                <p className="mt-0.5 text-[15px] font-bold text-black">{orderNumber}</p>
              </div>
              <span className="rounded-full bg-[#fef3c7] px-3 py-1 text-[11px] font-semibold text-[#92400e]">
                Aguardando Pagamento
              </span>
            </div>
            <div className="mt-3 border-t border-black/10 pt-3 space-y-1">
              <div className="flex justify-between text-[13px]">
                <span className="text-black/50">Valor Total</span>
                <span className="font-semibold text-black">
                  {total !== null ? `R$ ${Number(total).toFixed(2)}` : '—'}
                </span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-black/50">Forma de Pagamento</span>
                <span className="font-semibold text-black">{paymentLabel}</span>
              </div>
            </div>
          </div>

          {/* QR Code section */}
          <div className="mt-6 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/40">
              Pague via PIX
            </p>
            <div className="mx-auto mt-4 flex h-[140px] w-[140px] items-center justify-center rounded-[12px] bg-[#f0f0f0]">
              <p className="text-[13px] font-medium text-black/30">QR CODE</p>
            </div>

            {/* Copy button */}
            <button onClick={handleCopy}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-black/20 text-[13px] font-semibold text-black transition hover:border-black hover:bg-black/5">
              <Icon name="save" className="h-4 w-4" />
              {copied ? 'Código copiado!' : 'Copiar Código PIX'}
            </button>

            {/* Timer */}
            <p className="mt-2 text-[12px] font-medium text-[#cc0000]">
              {timeLeft > 0
                ? `Este código expira em ${formatTime(timeLeft)}`
                : 'Código expirado. Gere um novo pedido.'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="mt-6 space-y-3">
            <Link to="/my-orders"
              className="flex h-12 w-full items-center justify-center rounded-full bg-black text-[13px] font-bold uppercase tracking-widest text-white transition hover:bg-black/85">
              Ver Meus Pedidos
            </Link>
            <Link to="/"
              className="flex h-12 w-full items-center justify-center rounded-full border border-black/20 text-[13px] font-bold uppercase tracking-widest text-black transition hover:border-black">
              Continuar Comprando
            </Link>
          </div>

        </div>
      </section>
    </PublicLayout>
  );
};

export default PixPage;
