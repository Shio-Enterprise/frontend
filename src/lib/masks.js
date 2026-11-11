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
