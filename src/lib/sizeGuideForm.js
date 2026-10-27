import { ONE_SIZE, SIZE_OPTIONS } from '../components/admin/productForm';

// Tamanhos que um guia pode ter: os do cadastro de produto, menos "Único".
export const GUIDE_SIZES = SIZE_OPTIONS.filter((size) => size !== ONE_SIZE);

const sizeOrder = (size) => {
  const index = GUIDE_SIZES.indexOf(size);
  return index === -1 ? GUIDE_SIZES.length : index;
};

const slug = (label) => label
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '') || 'medida';

// Chave estável da medida: usada nas linhas do guia e nas dicas de "como medir".
export const columnKey = (label, columns) => {
  const base = slug(label);
  const taken = new Set(columns.map((column) => column.key));
  let key = base;
  for (let n = 2; taken.has(key); n += 1) key = `${base}_${n}`;
  return key;
};

const emptyMeasures = (columns) => Object.fromEntries(columns.map((column) => [column.key, ['', '']]));

export const emptyGuideForm = () => ({
  name: '',
  columns: [],
  rows: [],
  categories: [],
});

export const guideToForm = (guide) => ({
  name: guide.name,
  columns: guide.columns.map((column) => ({ ...column })),
  rows: guide.rows.map((row) => ({
    size: row.size,
    measures: Object.fromEntries(
      guide.columns.map((column) => [column.key, (row.measures[column.key] ?? ['', '']).map(String)]),
    ),
  })),
  categories: [...(guide.categories ?? [])],
});

export const addColumn = (form, label) => {
  const text = label.trim();
  if (!text) return form;
  const key = columnKey(text, form.columns);
  return {
    ...form,
    columns: [...form.columns, { key, label: text }],
    rows: form.rows.map((row) => ({ ...row, measures: { ...row.measures, [key]: ['', ''] } })),
  };
};

export const removeColumn = (form, key) => ({
  ...form,
  columns: form.columns.filter((column) => column.key !== key),
  rows: form.rows.map((row) => ({
    ...row,
    measures: Object.fromEntries(Object.entries(row.measures).filter(([k]) => k !== key)),
  })),
});

export const toggleGuideSize = (form, size) => {
  if (form.rows.some((row) => row.size === size)) {
    return { ...form, rows: form.rows.filter((row) => row.size !== size) };
  }
  const rows = [...form.rows, { size, measures: emptyMeasures(form.columns) }];
  return { ...form, rows: rows.sort((a, b) => sizeOrder(a.size) - sizeOrder(b.size)) };
};

export const setRangeValue = (form, size, key, index, value) => ({
  ...form,
  rows: form.rows.map((row) => {
    if (row.size !== size) return row;
    const range = [...row.measures[key]];
    range[index] = value;
    return { ...row, measures: { ...row.measures, [key]: range } };
  }),
});

export const toggleCategory = (form, id) => ({
  ...form,
  categories: form.categories.includes(id)
    ? form.categories.filter((category) => category !== id)
    : [...form.categories, id],
});

// Erro de preenchimento que dá para apontar antes de chamar a API.
export const formProblem = (form) => {
  if (!form.name.trim()) return 'Dê um nome ao guia.';
  if (!form.columns.length) return 'Adicione ao menos uma medida.';
  if (!form.rows.length) return 'Marque ao menos um tamanho.';
  for (const row of form.rows) {
    for (const column of form.columns) {
      const [min, max] = row.measures[column.key].map(Number);
      if (row.measures[column.key].some((v) => v === '')) return `Preencha mín e máx de ${column.label} no tamanho ${row.size}.`;
      if (!(min > 0 && min < max)) return `${column.label} no tamanho ${row.size}: o mín precisa ser menor que o máx.`;
    }
  }
  return null;
};

export const formToPayload = (form) => ({
  name: form.name.trim(),
  columns: form.columns,
  rows: form.rows.map((row) => ({
    size: row.size,
    measures: Object.fromEntries(
      form.columns.map((column) => [column.key, row.measures[column.key].map(Number)]),
    ),
  })),
  categories: form.categories,
});

const FIELD_LABELS = { name: 'Nome', columns: 'Medidas', rows: 'Tamanhos', categories: 'Categorias' };

// O backend responde { error, details: { campo: ["mensagem"] } }.
export const guideSaveError = (data) => {
  const details = data?.details;
  if (!details || typeof details !== 'object') return data?.error || data?.detail || 'Não foi possível salvar o guia.';
  return Object.entries(details)
    .map(([field, messages]) => `${FIELD_LABELS[field] || field}: ${[].concat(messages).join(' ')}`)
    .join('\n');
};
