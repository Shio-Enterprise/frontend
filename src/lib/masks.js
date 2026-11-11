// Máscaras dos dados pessoais. O backend aceita com ou sem pontuação e grava só os dígitos;
// aqui é só para a pessoa ver o formato enquanto digita.

export const onlyDigits = (value) => String(value ?? '').replace(/\D/g, '');

// 000.000.000-00, montado aos poucos conforme a digitação.
export const maskCpf = (value) => {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

// (61) 99999-9999 para celular e (61) 3333-4444 para fixo. Tira o +55 de quem colou
// ou usou o preenchimento automático do navegador.
export const maskPhone = (value) => {
  let d = onlyDigits(value);
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = `(${d.slice(0, 2)}) `;
  const rest = d.slice(2);
  if (rest.length <= 4) return ddd + rest;
  const split = rest.length === 9 ? 5 : 4;
  return `${ddd}${rest.slice(0, split)}-${rest.slice(split)}`;
};

export const PHONE_INVALID_MESSAGE = 'Telefone inválido. Informe DDD e número.';
export const MOBILE_NINE_DIGITS_MESSAGE =
  'Celular precisa ter 9 dígitos depois do DDD. Confira se falta o 9 no começo.';

// Mesmas regras do backend (authentication/phone.py). Vazio não é erro.
export const phoneError = (value) => {
  let d = onlyDigits(value);
  if (!String(value ?? '').trim()) return null;
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  const dddOk = d.length >= 3 && !d.slice(0, 2).includes('0');
  if (d.length === 10 && dddOk && '6789'.includes(d[2])) return MOBILE_NINE_DIGITS_MESSAGE;
  const valid = dddOk && new Set(d).size > 1 && (
    (d.length === 11 && d[2] === '9') || (d.length === 10 && '2345'.includes(d[2]))
  );
  return valid ? null : PHONE_INVALID_MESSAGE;
};

// Telefone vindo da API: válido ganha a máscara; fora do padrão (cadastro antigo) aparece
// como está, para a pessoa ver o que tem salvo em vez de um número inventado pela máscara.
export const displayPhone = (value) => {
  if (!String(value ?? '').trim()) return '';
  return phoneError(value) ? String(value) : maskPhone(value);
};
