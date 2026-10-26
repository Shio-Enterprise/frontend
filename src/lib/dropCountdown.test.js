import { describe, expect, it } from 'vitest';
import { getCountdownParts, getDropPhase } from './dropCountdown';

describe('getCountdownParts', () => {
  const now = new Date('2026-01-01T00:00:00.000Z').getTime();

  it('retorna isOver quando não há data', () => {
    expect(getCountdownParts(null, now)).toEqual({
      ms: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true,
    });
  });

  it('retorna isOver quando a data já passou', () => {
    const passado = new Date(now - 1000).toISOString();

    expect(getCountdownParts(passado, now).isOver).toBe(true);
  });

  it('decompõe corretamente dias, horas, minutos e segundos', () => {
    const totalMs = ((1 * 24 + 1) * 3600 + 1 * 60 + 1) * 1000; // 1d 1h 1min 1s
    const futuro = new Date(now + totalMs).toISOString();

    expect(getCountdownParts(futuro, now)).toEqual({
      ms: totalMs, days: 1, hours: 1, minutes: 1, seconds: 1, isOver: false,
    });
  });
});

describe('getDropPhase', () => {
  const now = new Date('2026-01-15T12:00:00.000Z').getTime();
  const antes = '2026-01-10T00:00:00.000Z';
  const depois = '2026-01-20T00:00:00.000Z';

  it('é "upcoming" antes do lançamento, mesmo se is_active for false', () => {
    expect(
      getDropPhase({ launch_date: depois, end_date: null, is_active: false }, now),
    ).toBe('upcoming');
  });

  it('é "live" entre o lançamento e o fim, com is_active true', () => {
    expect(
      getDropPhase({ launch_date: antes, end_date: depois, is_active: true }, now),
    ).toBe('live');
  });

  it('é "live" quando já lançou e não há end_date', () => {
    expect(
      getDropPhase({ launch_date: antes, end_date: null, is_active: true }, now),
    ).toBe('live');
  });

  it('é "ended" depois do end_date', () => {
    expect(
      getDropPhase({ launch_date: antes, end_date: '2026-01-14T00:00:00.000Z', is_active: true }, now),
    ).toBe('ended');
  });

  it('é "ended" quando o admin desativou o drop, mesmo dentro da janela', () => {
    expect(
      getDropPhase({ launch_date: antes, end_date: depois, is_active: false }, now),
    ).toBe('ended');
  });

  it('é "live" sem nenhuma data, desde que is_active seja true', () => {
    expect(
      getDropPhase({ launch_date: null, end_date: null, is_active: true }, now),
    ).toBe('live');
  });
});
