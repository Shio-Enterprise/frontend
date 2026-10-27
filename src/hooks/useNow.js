import { useEffect, useState } from 'react';

/**
 * Horário atual (ms), atualizado a cada `intervalMs`. Usado para a contagem
 * regressiva reagir ao tempo sem recarregar a página.
 */
const useNow = (intervalMs = 1000) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
};

export default useNow;
