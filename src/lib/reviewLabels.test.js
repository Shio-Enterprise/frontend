import { describe, expect, it } from 'vitest';
import { FIT_LABELS, REMOVAL_REASONS, asSentence, formatReviewDate, removalText } from './reviewLabels';

describe('reviewLabels', () => {
  it('traduz caimento e lista os motivos de remoção na ordem da spec', () => {
    expect(FIT_LABELS).toEqual({ SMALL: 'Pequeno', TRUE_TO_SIZE: 'Certo', LARGE: 'Grande' });
    expect(REMOVAL_REASONS.map((reason) => reason.label)).toEqual([
      'Linguagem ofensiva', 'Spam ou propaganda', 'Dados pessoais', 'Não fala do produto', 'Outro',
    ]);
  });

  it('monta o aviso de remoção com e sem detalhes', () => {
    expect(removalText({ removal_reason_label: 'Spam ou propaganda', removal_note: '' }))
      .toBe('Removida pela loja: Spam ou propaganda');
    expect(removalText({ removal_reason_label: 'Outro', removal_note: 'Link externo' }))
      .toBe('Removida pela loja: Outro — Link externo');
  });

  it('fecha a frase com ponto só quando ainda não há pontuação final', () => {
    expect(asSentence('Removida pela loja: Spam ou propaganda')).toBe('Removida pela loja: Spam ou propaganda.');
    expect(asSentence('Pode reenviar sem o link.')).toBe('Pode reenviar sem o link.');
    expect(asSentence('Sério?! ')).toBe('Sério?!');
  });

  it('formata a data em pt-BR', () => {
    expect(formatReviewDate('2026-09-20T12:00:00Z')).toMatch(/20 de set\.? de 2026/);
  });
});
