import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getAccessToken } from '../../lib/authToken';
import { BlackButton, Icon } from '../ui/ShioDesign';

const MAX_MESSAGE = 500;
const PREVIEW_DEBOUNCE_MS = 400;

const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (iso) => {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
};
const fmtDateTime = (iso) => {
  const d = new Date(iso);
  return `${fmtDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function CouponEmailModal({ coupon, onClose }) {
  const baseUrl = `${import.meta.env.VITE_API_URL}/api/orders/admin/coupons/${coupon.id}/email/`;
  const [info, setInfo] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [message, setMessage] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testFeedback, setTestFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const titleRef = useRef(null);

  const request = useCallback(
    (path, body) =>
      fetch(`${baseUrl}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAccessToken()}`,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
    [baseUrl],
  );

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let active = true;
    request('')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.detail || 'Erro ao carregar.');
        if (active) setInfo(data);
      })
      .catch((e) => active && setLoadError(e.message));
    return () => {
      active = false;
    };
  }, [request]);

  useEffect(() => {
    let active = true;
    const t = setTimeout(() => {
      request('preview/', { message })
        .then((res) => res.json())
        .then((data) => active && setPreviewHtml(data.html || ''))
        .catch(() => {});
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [message, request]);

  const handleTest = async () => {
    setTesting(true);
    setTestFeedback(null);
    try {
      const res = await request('test/', { message });
      const data = await res.json();
      setTestFeedback(
        res.ok
          ? { ok: true, text: 'Teste enviado para o seu e-mail.' }
          : { ok: false, text: data.error || 'Não foi possível enviar o teste.' },
      );
    } catch {
      setTestFeedback({ ok: false, text: 'Não foi possível enviar o teste.' });
    } finally {
      setTesting(false);
    }
  };

  const handleSend = async () => {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await request('send/', { message });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível enviar.');
      setResult(data);
      setConfirming(false);
    } catch (e) {
      setError(e.message);
      setConfirming(false);
    } finally {
      setSending(false);
    }
  };

  const audience = info?.audience;
  const history = info?.history || [];
  const noAudience = audience && audience.total === 0;
  const blocked = !info || !!info.block_reason || noAudience;
  const lastSend = history[0];

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="coupon-email-title"
        className="w-full max-w-2xl bg-white shadow-xl h-full flex flex-col overflow-hidden animate-slide-in-right"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2
            id="coupon-email-title"
            ref={titleRef}
            tabIndex={-1}
            className="text-xl font-bold uppercase tracking-tight outline-none"
          >
            Enviar cupom {coupon.code} por e-mail
          </h2>
          <button type="button" aria-label="Fechar" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <Icon name="close" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loadError && <div className="p-3 bg-red-100 text-red-700 text-sm rounded-md">{loadError}</div>}
          {!info && !loadError && <p className="text-sm text-gray-500">Carregando...</p>}

          {info?.block_reason && (
            <div className="p-3 bg-red-100 text-red-700 text-sm rounded-md">{info.block_reason}</div>
          )}
          {!info?.block_reason && noAudience && (
            <div className="p-3 bg-red-100 text-red-700 text-sm rounded-md">Ninguém para receber este e-mail.</div>
          )}

          {audience && (
            <div className="rounded-md bg-gray-50 border p-4 text-sm space-y-1">
              <p className="text-base font-bold">{audience.total} pessoas</p>
              <p>{audience.buyers} clientes que já compraram</p>
              <p>{audience.subscribers} inscritos na newsletter / cadastro</p>
              <p>{audience.overlap} aparecem nos dois (recebem 1 e-mail)</p>
              <p>{audience.suppressed} pediram para não receber</p>
            </div>
          )}

          {history.length > 0 && (
            <div className="text-xs text-gray-600 space-y-1">
              <p className="font-semibold uppercase tracking-wider">Envios anteriores</p>
              {history.map((h) => (
                <p key={h.sent_at}>
                  {fmtDateTime(h.sent_at)} · {h.sent_by_name || '—'} · {h.sent_count} enviados · {h.failed_count} falhas
                </p>
              ))}
            </div>
          )}

          <div>
            <label htmlFor="coupon-email-message" className="block text-sm font-semibold mb-1">
              Mensagem (opcional)
            </label>
            <textarea
              id="coupon-email-message"
              value={message}
              maxLength={MAX_MESSAGE}
              rows={4}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-500 text-right">{message.length}/{MAX_MESSAGE}</p>
          </div>

          <iframe
            title="Pré-visualização do e-mail"
            sandbox=""
            srcDoc={previewHtml}
            className="w-full h-96 border rounded-md bg-white"
          />

          {testFeedback && (
            <p role="status" className={`text-sm ${testFeedback.ok ? 'text-green-700' : 'text-red-700'}`}>
              {testFeedback.text}
            </p>
          )}
          {error && <div className="p-3 bg-red-100 text-red-700 text-sm rounded-md">{error}</div>}
          {result && (
            <div role="status" className="p-3 bg-green-50 text-green-800 text-sm rounded-md">
              {result.sent_count} enviados, {result.failed_count} falhas
            </div>
          )}

          {confirming && !result && (
            <div className="p-4 border-2 border-black rounded-md space-y-3">
              <p className="text-sm font-semibold">
                Enviar para {audience.total} pessoas? Não dá para desfazer.
              </p>
              {lastSend && (
                <p className="text-sm text-amber-700">
                  Este cupom já foi enviado em {fmtDate(lastSend.sent_at)} para {lastSend.sent_count} pessoas. Enviar de novo?
                </p>
              )}
              <div className="flex gap-3">
                <BlackButton onClick={handleSend} disabled={sending}>
                  {sending ? 'Enviando...' : 'Confirmar envio'}
                </BlackButton>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={sending}
                  className="px-4 py-2 text-sm font-bold border rounded-md hover:bg-gray-100"
                >
                  Voltar
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold border rounded-md hover:bg-gray-100">
            {result ? 'Fechar' : 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !info}
            className="px-4 py-2 text-sm font-bold border rounded-md hover:bg-gray-100 disabled:opacity-50"
          >
            Enviar teste para mim
          </button>
          <BlackButton onClick={() => setConfirming(true)} disabled={blocked || !!result || confirming || sending}>
            Enviar para {audience?.total ?? 0} pessoas
          </BlackButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
