// Sugere o tamanho para uma medida (em cm). As faixas do guia são [mín, máx):
// o máx de um tamanho é o mín do próximo; só o último tamanho inclui o máx.
export function recommendSize(guide, measureKey, value) {
  const cm = Number(value);
  if (!guide?.rows?.length || !Number.isFinite(cm) || cm <= 0) return null;
  const rangeOf = (row) => row.measures?.[measureKey];
  const rows = guide.rows.filter((row) => rangeOf(row));
  if (!rows.length) return null;

  const first = rows[0];
  const last = rows[rows.length - 1];
  if (cm < rangeOf(first)[0]) return { status: 'below', size: first.size };
  if (cm > rangeOf(last)[1]) return { status: 'above', size: last.size };

  // Primeiro tamanho cujo máx ainda não foi alcançado. Se a medida cair num
  // buraco entre duas faixas, fica com o tamanho maior, como na fronteira.
  const match = rows.find((row) => cm < rangeOf(row)[1]) ?? last;
  return { status: 'match', size: match.size };
}

export const formatRange = (range) => (Array.isArray(range) ? `${range[0]}–${range[1]}` : '—');
