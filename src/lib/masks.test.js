import { describe, it, expect } from 'vitest';
import {
  MOBILE_NINE_DIGITS_MESSAGE, PHONE_INVALID_MESSAGE,
  displayCpf, displayPhone, maskCpf, maskPhone, onlyDigits, phoneError,
} from './masks';

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

describe('phoneError', () => {
  it.each([
    ['', null],
    ['   ', null],
    [null, null],
    ['61999999999', null],
    ['(11) 3333-4444', null],
    ['+55 61 99999-9999', null],
    ['(61) 9999-9999', MOBILE_NINE_DIGITS_MESSAGE],
    ['+55 61 7777-6666', MOBILE_NINE_DIGITS_MESSAGE],
    ['99999-9999', PHONE_INVALID_MESSAGE],
    ['ligar à tarde', PHONE_INVALID_MESSAGE],
    ['01999999999', PHONE_INVALID_MESSAGE],
    ['61899999999', PHONE_INVALID_MESSAGE],
    ['11111111111', PHONE_INVALID_MESSAGE],
  ])('%s → %s', (value, expected) => {
    expect(phoneError(value)).toBe(expected);
  });
});

describe('displayPhone', () => {
  it('mascara o válido e mostra o antigo fora do padrão como está', () => {
    expect(displayPhone('61999999999')).toBe('(61) 99999-9999');
    expect(displayPhone('ligar à tarde')).toBe('ligar à tarde');
    expect(displayPhone('99999-9999')).toBe('99999-9999');
    expect(displayPhone(null)).toBe('');
    expect(displayPhone('  ')).toBe('');
  });
});

describe('displayCpf', () => {
  it('mascara 11 dígitos e mostra o resto como está', () => {
    expect(displayCpf('52998224725')).toBe('529.982.247-25');
    expect(displayCpf('529.982.247-25')).toBe('529.982.247-25');
    expect(displayCpf('não informado')).toBe('não informado');
    expect(displayCpf('123.456.789-0012')).toBe('123.456.789-0012');
    expect(displayCpf(null)).toBe('');
  });
});
