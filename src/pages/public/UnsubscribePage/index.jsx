import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../../../lib/axios';
import PublicLayout from '../../../components/layout/public/PublicLayout';

const INVALID_MESSAGE = 'Este link de descadastro é inválido.';

const UnsubscribePage = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading | ready | invalid | done
  const [maskedEmail, setMaskedEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const path = `/auth/marketing/unsubscribe/${encodeURIComponent(token)}/`;

  useEffect(() => {
    let active = true;
    apiClient
      .get(path)
      .then((res) => {
        if (!active) return;
        setMaskedEmail(res.data.email);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        if (err.response?.status === 400) setStatus('invalid');
        else {
          setError('Não foi possível carregar. Tente novamente mais tarde.');
          setStatus('ready');
        }
      });
    return () => {
      active = false;
    };
  }, [path]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await apiClient.post(path);
      setMessage(res.data.message);
      setStatus('done');
    } catch (err) {
      if (err.response?.status === 400) setStatus('invalid');
      else setError('Não foi possível concluir o descadastro. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicLayout showNewsletter={false}>
      <div className="flex items-center justify-center px-4 py-20 font-sans text-gray-800">
        <div className="w-full max-w-[420px] flex flex-col items-center text-center">
          <h1 className="text-2xl text-black font-medium mb-4">Descadastrar de promoções</h1>

          {status === 'loading' && <p className="text-[14px] text-gray-500">Carregando...</p>}

          {status === 'invalid' && (
            <p role="alert" className="text-[14px] text-red-600">{INVALID_MESSAGE}</p>
          )}

          {status === 'done' && (
            <p role="status" className="text-[14px] text-gray-700">{message}</p>
          )}

          {status === 'ready' && (
            <>
              {maskedEmail && (
                <p className="text-[14px] text-gray-500 mb-6">
                  Você deixará de receber promoções em <strong>{maskedEmail}</strong>.
                </p>
              )}
              {error && <p role="alert" className="text-[14px] text-red-600 mb-4">{error}</p>}
              {maskedEmail && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="w-full h-[48px] bg-black text-white text-[14px] font-medium disabled:opacity-50"
                >
                  Confirmar descadastro
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};

export default UnsubscribePage;
