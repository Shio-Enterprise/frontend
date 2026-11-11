import { describe, it, expect } from 'vitest';
import { maskCpf, maskPhone, onlyDigits } from './masks';

describe('onlyDigits', () => {
  it('tira tudo que não é número', () => {
    expect(onlyDigits('(61) 9a9999-9999')).toBe('61999999999');
    expect(onlyDigits(null)).toBe('');
    expect(onlyDigits(undefined)).toBe('');
  });
});

describe('maskCpf', () => {
  it.each([
    ['', ''],
    ['529', '529'],
    ['5299', '529.9'],
    ['529982', '529.982'],
    ['5299822', '529.982.2'],
    ['529982247', '529.982.247'],
    ['5299822472', '529.982.247-2'],
    ['52998224725', '529.982.247-25'],
    ['529.982.247-25', '529.982.247-25'],
    ['52998224725999', '529.982.247-25'],
    [null, ''],
  ])('%s → %s', (value, expected) => {
    expect(maskCpf(value)).toBe(expected);
  });
});

describe('maskPhone', () => {
  it.each([
    ['', ''],
    ['6', '(6'],
    ['61', '(61'],
    ['619', '(61) 9'],
    ['619999', '(61) 9999'],
    ['6199999', '(61) 9999-9'],
    ['1133334444', '(11) 3333-4444'],
    ['61999999999', '(61) 99999-9999'],
    ['(61) 99999-9999', '(61) 99999-9999'],
    ['+55 61 99999-9999', '(61) 99999-9999'],
    ['+55 11 3333-4444', '(11) 3333-4444'],
    ['619999999990', '(61) 99999-9999'],
    ['texto sem número', ''],
    [null, ''],
  ])('%s → %s', (value, expected) => {
    expect(maskPhone(value)).toBe(expected);
  });
});
