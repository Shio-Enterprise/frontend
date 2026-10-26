import { describe, expect, it } from 'vitest';
import { formatRange, recommendSize } from './sizeGuide';

const guide = {
  columns: [{ key: 'waist', label: 'Cintura' }],
  rows: [
    { size: 'P', measures: { waist: [74, 80] } },
    { size: 'M', measures: { waist: [80, 86] } },
    { size: 'G', measures: { waist: [86, 92] } },
  ],
};

describe('recommendSize', () => {
  it('acha o tamanho dentro da faixa', () => {
    expect(recommendSize(guide, 'waist', 77)).toEqual({ status: 'match', size: 'P' });
    expect(recommendSize(guide, 'waist', '83.5')).toEqual({ status: 'match', size: 'M' });
  });

  it('na fronteira entre dois tamanhos escolhe o maior', () => {
    expect(recommendSize(guide, 'waist', 80)).toEqual({ status: 'match', size: 'M' });
  });

  it('inclui o máx do último tamanho', () => {
    expect(recommendSize(guide, 'waist', 92)).toEqual({ status: 'match', size: 'G' });
  });

  it('indica o mais próximo quando fora da tabela', () => {
    expect(recommendSize(guide, 'waist', 50)).toEqual({ status: 'below', size: 'P' });
    expect(recommendSize(guide, 'waist', 120)).toEqual({ status: 'above', size: 'G' });
  });

  it('retorna null para entrada inválida ou medida inexistente', () => {
    expect(recommendSize(guide, 'waist', '')).toBeNull();
    expect(recommendSize(guide, 'waist', -3)).toBeNull();
    expect(recommendSize(guide, 'chest', 90)).toBeNull();
    expect(recommendSize(null, 'waist', 80)).toBeNull();
  });
});

it('formatRange', () => {
  expect(formatRange([74, 80])).toBe('74–80');
});
