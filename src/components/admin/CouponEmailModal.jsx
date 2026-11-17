import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Dialog from '../ui/Dialog';
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

const pessoas = (n) => `${n} ${n === 1 ? 'pessoa' : 'pessoas'}`;
const enviados = (n) => `${n} ${n === 1 ? 'enviado' : 'enviados'}`;
const falhas = (n) => `${n} ${n === 1 ? 'falha' : 'falhas'}`;

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
  const titleId = useId();
  // Ao terminar o envio a caixa de confirmação (onde estava o foco) some: o foco vai para o
  // resultado ou para o erro, senão cairia no início da página (#64).
  const outcomeRef = useRef(null);
  useEffect(() => {
    if (result || error) outcomeRef.current?.focus();
  }, [result, error]);

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

  // Enquanto envia não dá para fechar (nem com Esc): o resultado precisa aparecer.
  const close = () => {
    if (!sending) onClose();
  };

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
          ? { ok: true, text: data.to ? `Teste enviado para ${data.to}.` : 'Teste enviado para o seu e-mail.' }
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

  return (
    <Dialog
      labelledBy={titleId}
      onClose={close}
      overlayClassName="bg-black/40"
      className="ml-auto flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-xl animate-slide-in-right"
    >
        <div className="flex items-center justify-between gap-3 border-b px-6 py-3">
          <h2 id={titleId} className="text-xl font-bold uppercase tracking-tight">
            Enviar cupom {coupon.code} por e-mail
          </h2>
          <button type="button" aria-label="Fechar" onClick={close} disabled={sending} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-black/5 disabled:opacity-50">
            <Icon name="close" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loadError && <div role="alert" className="p-3 bg-red-100 text-red-700 text-sm rounded-md">{loadError}</div>}
          {!info && !loadError && <p role="status" className="text-sm text-shio-muted">Carregando...</p>}

          {info?.block_reason && (
            <div className="p-3 bg-red-100 text-red-700 text-sm rounded-md">{info.block_reason}</div>
          )}
          {!info?.block_reason && noAudience && (
            <div className="p-3 bg-red-100 text-red-700 text-sm rounded-md">Ninguém para receber este e-mail.</div>
          )}

          {audience && (
            <div className="rounded-md bg-gray-50 border p-4 text-sm space-y-1">
              <p className="text-base font-bold">{pessoas(audience.total)}</p>
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
                  {fmtDateTime(h.sent_at)} · {h.sent_by_name || '—'} · {enviados(h.sent_count)} · {falhas(h.failed_count)}
                </p>
              ))}
            </div>
          )}

          <div>
            <label htmlFor="coupon-email-message" className="block text-sm font-semibold mb-1">
              Mensagem (opcional)
            </label>
            <p id={`${titleId}-hint`} className="text-xs text-shio-muted mb-1">
              Para chamar a pessoa pelo nome, escreva {"{nome}"}. Ex.: "Olá, {"{nome}"}!". Quem não tem nome cadastrado recebe "Olá!".
            </p>
            <textarea
              id="coupon-email-message"
              aria-describedby={`${titleId}-hint ${titleId}-count`}
              value={message}
              maxLength={MAX_MESSAGE}
              rows={4}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
            <p id={`${titleId}-count`} className="text-xs text-shio-muted text-right">{message.length}/{MAX_MESSAGE} caracteres</p>
          </div>

          <iframe
            title="Pré-visualização do e-mail"
            sandbox=""
            srcDoc={previewHtml}
            className="w-full h-96 border rounded-md bg-white"
          />

          {error && <div ref={result ? undefined : outcomeRef} tabIndex={-1} role="alert" className="p-3 bg-red-100 text-red-700 text-sm rounded-md">{error}</div>}
          {result && (
            <div ref={outcomeRef} tabIndex={-1} role="status" className="p-3 bg-green-50 text-green-800 text-sm rounded-md">
              {enviados(result.sent_count)}, {falhas(result.failed_count)}
            </div>
          )}

          {confirming && !result && (
            <div className="p-4 border-2 border-black rounded-md space-y-3">
              <p className="text-sm font-semibold">
                Enviar para {pessoas(audience.total)}? Não dá para desfazer.
              </p>
              {lastSend && (
                <p className="text-sm text-amber-700">
                  Este cupom já foi enviado em {fmtDate(lastSend.sent_at)} para {pessoas(lastSend.sent_count)}. Enviar de novo?
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
                  className="h-12 rounded-md border border-black/25 px-4 text-sm font-bold hover:bg-black/5"
                >
                  Voltar
                </button>
              </div>
            </div>
          )}
        </div>

        <div data-modal-footer className="flex shrink-0 flex-wrap justify-end gap-3 border-t bg-gray-50 p-4">
          {/* No rodapé, junto do botão: depois da prévia o aviso ficava fora da tela. */}
          {testFeedback && (
            <p
              role="status"
              className={`w-full text-right text-sm font-semibold ${testFeedback.ok ? 'text-shio-success' : 'text-shio-danger'}`}
            >
              {testFeedback.text}
            </p>
          )}
          <button type="button" onClick={close} disabled={sending} className="h-12 rounded-md border border-black/25 px-4 text-sm font-bold hover:bg-black/5 disabled:opacity-50">
            {result ? 'Fechar' : 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !info}
            className="h-12 rounded-md border border-black/25 px-4 text-sm font-bold hover:bg-black/5 disabled:opacity-50"
          >
            {testing ? 'Enviando teste...' : 'Enviar teste para mim'}
          </button>
          <BlackButton onClick={() => setConfirming(true)} disabled={blocked || !!result || confirming || sending}>
            Enviar para {pessoas(audience?.total ?? 0)}
          </BlackButton>
        </div>
    </Dialog>
  );
}
