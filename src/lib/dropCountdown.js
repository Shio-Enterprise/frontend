/**
 * Funções puras de data para a página pública do drop (`/drop/:slug`).
 * Separadas da página para serem testadas sem precisar montar componentes.
 */

/**
 * Decompõe o tempo até `targetIso` em dias/horas/minutos/segundos.
 * `isOver` é true quando não há data ou quando ela já passou.
 */
export function getCountdownParts(targetIso, now = Date.now()) {
  if (!targetIso) {
    return { ms: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true };
  }

  const ms = new Date(targetIso).getTime() - now;
  if (Number.isNaN(ms) || ms <= 0) {
    return { ms: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true };
  }

  const totalSeconds = Math.floor(ms / 1000);
  return {
    ms,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    isOver: false,
  };
}

/**
 * Estado do drop em relação ao tempo: 'upcoming' (antes do lançamento),
 * 'ended' (depois do fim, ou desativado pelo admin) ou 'live'.
 * Não depende de max_quantity — esgotado é tratado separadamente, a partir
 * de remaining_quantity, porque continua "live" até o fim da janela.
 */
export function getDropPhase(drop, now = Date.now()) {
  const launch = drop.launch_date ? new Date(drop.launch_date).getTime() : null;
  const end = drop.end_date ? new Date(drop.end_date).getTime() : null;

  if (launch !== null && now < launch) return 'upcoming';
  if (!drop.is_active) return 'ended';
  if (end !== null && now > end) return 'ended';
  return 'live';
}
