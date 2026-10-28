import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from './axios';
import {
  cancelStockAlert, createStockAlert, getPendingStockAlertVariationIds, listStockAlerts, stockAlertErrorMessage,
} from './stockAlertsApi';

vi.mock('./axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

describe('stockAlertsApi', () => {
  it('cria o aviso e mapeia already_pending para alreadyPending', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { id: 'a1', already_pending: false } });
    await expect(createStockAlert('v1')).resolves.toEqual({
      alreadyPending: false, alert: { id: 'a1', already_pending: false },
    });
    expect(apiClient.post).toHaveBeenCalledWith('/catalog/stock-alerts/', { variation_id: 'v1' });
    apiClient.post.mockResolvedValueOnce({ data: { id: 'a1', already_pending: true } });
    const result = await createStockAlert('v1');
    expect(result.alreadyPending).toBe(true);
  });

  it('busca os ids de variações com aviso pendente', async () => {
    apiClient.get.mockResolvedValue({ data: { variation_ids: ['v1', 'v2'] } });
    await expect(getPendingStockAlertVariationIds()).resolves.toEqual(['v1', 'v2']);
    expect(apiClient.get).toHaveBeenCalledWith('/catalog/stock-alerts/pending-variations/');
  });

  it('lista os avisos devolvendo results', async () => {
    apiClient.get.mockResolvedValue({ data: { results: [{ id: 'a1' }] } });
    await expect(listStockAlerts()).resolves.toEqual([{ id: 'a1' }]);
    expect(apiClient.get).toHaveBeenCalledWith('/catalog/stock-alerts/');
  });

  it('cancela um aviso', async () => {
    apiClient.delete.mockResolvedValue({ status: 204 });
    await expect(cancelStockAlert('a1')).resolves.toBeUndefined();
    expect(apiClient.delete).toHaveBeenCalledWith('/catalog/stock-alerts/a1/');
  });

  it('extrai a primeira mensagem do 400 ou usa o texto padrão', () => {
    const error = { response: { data: { variation_id: ['Este tamanho está disponível.'] } } };
    expect(stockAlertErrorMessage(error)).toBe('Este tamanho está disponível.');
    expect(stockAlertErrorMessage(new Error('x'))).toBe('Não foi possível registrar o aviso.');
  });
});
