import apiClient from './axios';

export async function createStockAlert(variationId) {
  const { data } = await apiClient.post('/catalog/stock-alerts/', { variation_id: variationId });
  return { alreadyPending: Boolean(data.already_pending), alert: data };
}

export async function getPendingStockAlertVariationIds() {
  const { data } = await apiClient.get('/catalog/stock-alerts/pending-variations/');
  return data.variation_ids ?? [];
}

export async function listStockAlerts() {
  const { data } = await apiClient.get('/catalog/stock-alerts/');
  return data.results ?? [];
}

export async function cancelStockAlert(id) {
  await apiClient.delete(`/catalog/stock-alerts/${id}/`);
}

export function stockAlertErrorMessage(error, fallback = 'Não foi possível registrar o aviso.') {
  const data = error?.response?.data;
  if (typeof data?.message === 'string') return data.message;
  if (data && typeof data === 'object') {
    const first = Object.values(data).flat()[0];
    if (typeof first === 'string') return first;
  }
  return fallback;
}
