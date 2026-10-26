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

  const match = rows.find((row, i) => {
    const [min, max] = rangeOf(row);
    return cm >= min && (cm < max || (i === rows.length - 1 && cm <= max));
  });
  return match ? { status: 'match', size: match.size } : null;
}

export const formatRange = ([min, max]) => `${min}–${max}`;
