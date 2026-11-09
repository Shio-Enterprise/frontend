import { describe, expect, it } from 'vitest';
import {
  addColumn, columnKey, emptyGuideForm, formProblem, formToPayload, guideSaveError, guideToForm,
  removeColumn, setRangeValue, toggleCategory, toggleGuideSize,
} from './sizeGuideForm';

const guide = {
  name: 'Calças',
  columns: [{ key: 'waist', label: 'Cintura' }],
  rows: [
    { size: 'P', measures: { waist: [74, 80] } },
    { size: 'M', measures: { waist: [80, 86] } },
  ],
  categories: ['c1'],
};

describe('sizeGuideForm', () => {
  it('ida e volta do guia para o formulário mantém o guia', () => {
    expect(formToPayload(guideToForm(guide))).toEqual({
      name: 'Calças', columns: guide.columns, rows: guide.rows, categories: ['c1'],
    });
  });

  it('gera chave sem acento e sem repetir', () => {
    expect(columnKey('Tórax', [])).toBe('torax');
    expect(columnKey('Tórax', [{ key: 'torax' }])).toBe('torax_2');
    expect(columnKey('Comprimento da manga', [])).toBe('comprimento_da_manga');
  });

  it('adicionar e remover medida atualiza todas as linhas', () => {
    let form = addColumn(guideToForm(guide), '  Quadril ');
    expect(form.columns.at(-1)).toEqual({ key: 'quadril', label: 'Quadril' });
    expect(form.rows.every((row) => row.measures.quadril)).toBe(true);
    form = removeColumn(form, 'waist');
    expect(form.columns.map((c) => c.key)).toEqual(['quadril']);
    expect(Object.keys(form.rows[0].measures)).toEqual(['quadril']);
    expect(addColumn(form, '   ')).toBe(form);
  });

  it('marcar tamanho cria a linha na ordem e desmarcar remove', () => {
    let form = toggleGuideSize(guideToForm(guide), 'PP');
    expect(form.rows.map((r) => r.size)).toEqual(['PP', 'P', 'M']);
    expect(form.rows[0].measures.waist).toEqual(['', '']);
    form = toggleGuideSize(form, 'P');
    expect(form.rows.map((r) => r.size)).toEqual(['PP', 'M']);
  });

  it('aponta o que falta antes de salvar', () => {
    expect(formProblem(emptyGuideForm())).toBe('Dê um nome ao guia.');
    let form = toggleGuideSize(guideToForm(guide), 'G');
    expect(formProblem(form)).toBe('Preencha mín e máx de Cintura no tamanho G.');
    form = setRangeValue(form, 'G', 'waist', 0, '92');
    form = setRangeValue(form, 'G', 'waist', 1, '86');
    expect(formProblem(form)).toBe('Cintura no tamanho G: o mín precisa ser menor que o máx.');
    form = setRangeValue(form, 'G', 'waist', 0, '86');
    form = setRangeValue(form, 'G', 'waist', 1, '92');
    expect(formProblem(form)).toBeNull();
    expect(formToPayload(form).rows.at(-1)).toEqual({ size: 'G', measures: { waist: [86, 92] } });
  });

  it('liga e desliga categorias', () => {
    const form = toggleCategory(guideToForm(guide), 'c2');
    expect(form.categories).toEqual(['c1', 'c2']);
    expect(toggleCategory(form, 'c1').categories).toEqual(['c2']);
  });

  it('traduz o erro do backend', () => {
    expect(guideSaveError({ error: 'Dados inválidos.', details: { rows: ['M deve vir depois de P.'], name: ['Já existe.'] } }))
      .toBe('Tamanhos: M deve vir depois de P.\nNome: Já existe.');
    expect(guideSaveError({ detail: 'Sem permissão.' })).toBe('Sem permissão.');
    expect(guideSaveError(null)).toBe('Não foi possível salvar o guia.');
  });
});
