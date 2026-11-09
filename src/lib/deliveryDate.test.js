import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { formatDeliveryDate } from './deliveryDate';

// O CI roda em UTC, onde o erro não aparece: fixa o fuso de Brasília.
beforeAll(() => {
  vi.stubEnv('TZ', 'America/Sao_Paulo');
});
afterAll(() => {
  vi.unstubAllEnvs();
});

describe('formatDeliveryDate', () => {
  it('data sem hora mostra o mesmo dia, sem voltar um dia pelo fuso', () => {
    expect(formatDeliveryDate('2026-11-10')).toBe('10 de nov. de 2026');
  });

  it('data com hora sem fuso mostra o dia informado', () => {
    expect(formatDeliveryDate('2026-11-10T23:59:59')).toBe('10 de nov. de 2026');
  });

  it('data com fuso explícito é convertida para o horário local', () => {
    expect(formatDeliveryDate('2026-11-10T01:00:00+00:00')).toBe('09 de nov. de 2026');
  });

  it('valor vazio ou inválido não mostra nada', () => {
    expect(formatDeliveryDate(null)).toBe('');
    expect(formatDeliveryDate('')).toBe('');
    expect(formatDeliveryDate('amanhã')).toBe('');
  });
});
