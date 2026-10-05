export const COMMENT_MAX = 1000;
export const REMOVAL_NOTE_MAX = 500;
export const REPLY_MAX = 1000;

export const FIT_OPTIONS = [
  { value: 'SMALL', label: 'Pequeno' },
  { value: 'TRUE_TO_SIZE', label: 'Certo' },
  { value: 'LARGE', label: 'Grande' },
];

export const FIT_LABELS = Object.fromEntries(FIT_OPTIONS.map(({ value, label }) => [value, label]));

export const REMOVAL_REASONS = [
  { value: 'OFFENSIVE', label: 'Linguagem ofensiva' },
  { value: 'SPAM', label: 'Spam ou propaganda' },
  { value: 'PERSONAL_DATA', label: 'Dados pessoais' },
  { value: 'OFF_TOPIC', label: 'Não fala do produto' },
  { value: 'OTHER', label: 'Outro' },
];

export function removalText(review) {
  const reason = review.removal_reason_label ?? 'motivo não informado';
  return review.removal_note
    ? `Removida pela loja: ${reason} — ${review.removal_note}`
    : `Removida pela loja: ${reason}`;
}

export function asSentence(text) {
  const trimmed = text.trimEnd();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function formatReviewDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
