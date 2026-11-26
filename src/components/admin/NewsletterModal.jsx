import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Dialog from '../ui/Dialog';
import { getAccessToken } from '../../lib/authToken';
import { BlackButton, Icon } from '../ui/ShioDesign';

const MAX_SUBJECT = 255;
// Mesmo limite do backend (NewsletterEmailMessageSerializer)
const MAX_MESSAGE = 10000;
const PREVIEW_DEBOUNCE_MS = 400;

const testSentText = (to) => (to ? `Teste enviado para ${to}.` : 'Teste enviado para o seu e-mail.');

const inscritos = (n) => `${n} ${n === 1 ? 'inscrito' : 'inscritos'}`;

export default function NewsletterModal({ onClose, onSent }) {
  const baseUrl = `${import.meta.env.VITE_API_URL}/api/auth/admin/newsletter/`;
  const [info, setInfo] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testFeedback, setTestFeedback] = useState(null);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const titleId = useId();

  // Ao terminar o envio, a caixa de confirmação some e o foco vai para o resultado ou erro (#64)
  const outcomeRef = useRef(null);
  useEffect(() => {
    if (result || error) outcomeRef.current?.focus();
  }, [result, error]);

  // O botão "Enviar para N" fica desabilitado ao pedir confirmação: o foco vai para a
  // caixa de confirmação (que rola para a área visível) e não para o body. Não vai direto
  // para "Confirmar envio" para um Enter acidental não disparar o envio.
  // "Voltar" devolve o foco ao botão de envio.
  const confirmRef = useRef(null);
  const sendButtonRef = useRef(null);
  const returnFocusToSend = useRef(false);
  useEffect(() => {
    if (confirming) {
      confirmRef.current?.focus();
    } else if (returnFocusToSend.current) {
      returnFocusToSend.current = false;
      sendButtonRef.current?.focus();
    }
  }, [confirming]);

  const cancelConfirm = () => {
    returnFocusToSend.current = true;
    setConfirming(false);
  };

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

  // Não fecha enquanto envia (nem com Esc nem com clique)
  const close = () => {
    if (!sending) onClose();
  };

  useEffect(() => {
    let active = true;
    request('')
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || data.detail || 'Erro ao carregar dados da newsletter.');
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
      request('preview/', { subject, message })
        .then((res) => res.json())
        .then((data) => active && setPreviewHtml(data.html || ''))
        .catch(() => {});
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [subject, message, request]);

  const handleTest = async () => {
    if (!subject.trim() || !message.trim()) {
      setTestFeedback({ ok: false, text: 'Preencha o assunto e a mensagem antes de enviar o teste.' });
      return;
    }
    setTesting(true);
    setTestFeedback(null);
    try {
      const res = await request('test/', { subject, message });
      const data = await res.json();
      setTestFeedback(
        res.ok
          ? { ok: true, text: testSentText(data.to) }
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
      const res = await request('send/', { subject, message });
      const data = await res.json().catch(() => ({}));
      // 202: o envio começou e segue em segundo plano; 409: já há outro em andamento
      if (!res.ok) throw new Error(data.error || 'Não foi possível enviar a newsletter.');
      setResult(data);
      setConfirming(false);
      onSent?.(data);
    } catch (e) {
      setError(e.message);
      setConfirming(false);
    } finally {
      setSending(false);
    }
  };

  const totalSubscribers = info?.total_subscribers ?? 0;
  const noAudience = info && totalSubscribers === 0;
  const canSend = Boolean(
    info &&
    !noAudience &&
    subject.trim() &&
    message.trim() &&
    !result &&
    !confirming &&
    !sending
  );

  return (
    <Dialog
      labelledBy={titleId}
      onClose={close}
      overlayClassName="bg-black/40"
      className="ml-auto flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-xl animate-slide-in-right"
    >
      <div className="flex items-center justify-between gap-3 border-b border-black/10 px-6 py-4">
        <h2 id={titleId} className="text-xl font-bold uppercase tracking-tight">
          Enviar Newsletter
        </h2>
        <button
          type="button"
          aria-label="Fechar"
          onClick={close}
          disabled={sending}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-black/5 disabled:opacity-50"
        >
          <Icon name="close" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {loadError && (
          <div role="alert" className="p-3 bg-red-50 text-shio-danger text-sm font-semibold rounded-md">
            {loadError}
          </div>
        )}
        {!info && !loadError && (
          <p role="status" className="text-sm text-shio-muted">Carregando...</p>
        )}

        {noAudience && (
          <div role="alert" className="p-3 bg-amber-50 text-shio-warning text-sm font-semibold rounded-md">
            Nenhum inscrito elegível com consentimento LGPD ativo no momento.
          </div>
        )}

        {info && (
          <div className="rounded-md bg-gray-50 border border-black/10 p-4 text-sm space-y-1">
            <p className="text-base font-bold text-black" data-testid="subscriber-count">
              {inscritos(totalSubscribers)}
            </p>
            <p className="text-xs text-shio-muted">
              Apenas inscritos que aceitaram receber a newsletter e não cancelaram a inscrição.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="newsletter-subject" className="block text-sm font-semibold mb-1">
            Assunto do e-mail
          </label>
          <input
            id="newsletter-subject"
            type="text"
            value={subject}
            maxLength={MAX_SUBJECT}
            onChange={(e) => setSubject(e.target.value.slice(0, MAX_SUBJECT))}
            placeholder="Ex: Nova coleção outono/inverno disponível na Shio"
            className="w-full border rounded-md px-3 py-2 text-sm focus:border-black focus:outline-none"
          />
          <p className="text-xs text-shio-muted text-right mt-1">
            {subject.length}/{MAX_SUBJECT} caracteres
          </p>
        </div>

        <div>
          <label htmlFor="newsletter-message" className="block text-sm font-semibold mb-1">
            Mensagem
          </label>
          <p id={`${titleId}-msg-hint`} className="text-xs text-shio-muted mb-1">
            Para chamar a pessoa pelo nome, escreva {"{nome}"}. Ex.: "Olá, {"{nome}"}!". Quem não tem nome cadastrado recebe "Olá!".
          </p>
          <textarea
            id="newsletter-message"
            aria-describedby={`${titleId}-msg-hint ${titleId}-msg-count`}
            value={message}
            maxLength={MAX_MESSAGE}
            rows={5}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
            placeholder="Escreva a mensagem da newsletter para os inscritos..."
            className="w-full border rounded-md px-3 py-2 text-sm focus:border-black focus:outline-none"
          />
          <p id={`${titleId}-msg-count`} className="text-xs text-shio-muted text-right mt-1">
            {message.length}/{MAX_MESSAGE} caracteres
          </p>
        </div>

        <div>
          <span className="block text-sm font-semibold mb-1">Pré-visualização do e-mail</span>
          <iframe
            title="Pré-visualização da newsletter"
            sandbox=""
            srcDoc={previewHtml}
            className="w-full h-80 border rounded-md bg-white"
          />
        </div>

        {error && (
          <div
            ref={result ? undefined : outcomeRef}
            tabIndex={-1}
            role="alert"
            className="p-3 bg-red-50 text-shio-danger text-sm font-semibold rounded-md"
          >
            {error}
          </div>
        )}

        {result && (
          <div
            ref={outcomeRef}
            tabIndex={-1}
            role="status"
            className="p-4 bg-green-50 border border-shio-success text-shio-success text-sm rounded-md space-y-1"
          >
            <p className="font-semibold">Envio iniciado!</p>
            <p>
              A newsletter está sendo enviada para {inscritos(result.total_count ?? totalSubscribers)} em
              segundo plano. Você pode fechar esta janela e acompanhar o andamento no histórico.
            </p>
          </div>
        )}

        {confirming && !result && (
          <div
            ref={confirmRef}
            tabIndex={-1}
            role="group"
            aria-labelledby={`${titleId}-confirm`}
            aria-describedby={`${titleId}-confirm-desc`}
            className="p-4 border-2 border-black rounded-md space-y-3 bg-amber-50/40"
          >
            <p id={`${titleId}-confirm`} className="text-sm font-semibold text-black">
              Enviar para {inscritos(totalSubscribers)}? Não dá para desfazer.
            </p>
            <p id={`${titleId}-confirm-desc`} className="text-xs text-shio-muted">
              Cada pessoa receberá um e-mail individual com seu link exclusivo para cancelar a inscrição a qualquer momento.
            </p>
            <div className="flex gap-3">
              <BlackButton onClick={handleSend} disabled={sending}>
                {sending ? 'Enviando...' : 'Confirmar envio'}
              </BlackButton>
              <button
                type="button"
                onClick={cancelConfirm}
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
        <button
          type="button"
          onClick={close}
          disabled={sending}
          className="h-12 rounded-md border border-black/25 px-4 text-sm font-bold hover:bg-black/5 disabled:opacity-50"
        >
          {result ? 'Fechar' : 'Cancelar'}
        </button>
        <button
          type="button"
          onClick={handleTest}
          disabled={testing || !info || !subject.trim() || !message.trim()}
          className="h-12 rounded-md border border-black/25 px-4 text-sm font-bold hover:bg-black/5 disabled:opacity-50"
        >
          {testing ? 'Enviando teste...' : 'Enviar teste para mim'}
        </button>
        <BlackButton
          ref={sendButtonRef}
          onClick={() => setConfirming(true)}
          disabled={!canSend}
        >
          Enviar para {inscritos(totalSubscribers)}
        </BlackButton>
      </div>
    </Dialog>
  );
}
