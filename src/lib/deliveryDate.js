const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

// Previsão de entrega dos Correios. Data sem hora ("2026-11-10") é lida pelo
// JavaScript como meia-noite UTC, o que em Brasília vira o dia anterior; por
// isso ela é montada no fuso local. Com hora, segue a conversão normal.
export function formatDeliveryDate(value) {
  if (!value) return '';
  const match = DATE_ONLY.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
