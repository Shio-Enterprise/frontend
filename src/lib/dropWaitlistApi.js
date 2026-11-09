import apiClient from './axios';

/**
 * Entra na lista de espera de um drop.
 * Retorna { alreadyJoined, entry } onde alreadyJoined é true se já estava na lista.
 */
export async function joinDropWaitlist(dropId) {
  const resp = await apiClient.post(`/catalog/drops/${dropId}/waitlist/`);
  return { alreadyJoined: resp.status === 200, entry: resp.data };
}

/**
 * Sai da lista de espera de um drop.
 */
export async function leaveDropWaitlist(dropId) {
  await apiClient.delete(`/catalog/drops/${dropId}/waitlist/delete/`);
}

/**
 * Lista todas as entradas da lista de espera do usuário logado.
 * @returns {Array} lista de entradas
 */
export async function getMyWaitlistEntries() {
  const { data } = await apiClient.get('/catalog/drop-waitlist/');
  return data.results ?? [];
}

/**
 * Retorna os drops já abertos que o usuário ainda não viu no modal.
 * @returns {Array} lista de entradas com seen_at nulo e drop já aberto
 */
export async function getUnseenOpenDrops() {
  const { data } = await apiClient.get('/catalog/drop-waitlist/unseen/');
  return data.results ?? [];
}

/**
 * Marca uma entrada da lista de espera como vista (fecha o modal).
 * @param {string} entryId - UUID da entrada DropWaitlist
 */
export async function markWaitlistEntrySeen(entryId) {
  const { data } = await apiClient.post(`/catalog/drop-waitlist/${entryId}/seen/`);
  return data;
}

/**
 * Extrai mensagem de erro legível de um erro de API.
 */
export function waitlistErrorMessage(error, fallback = 'Não foi possível atualizar a lista de espera.') {
  const data = error?.response?.data;
  if (typeof data?.detail === 'string') return data.detail;
  if (typeof data?.message === 'string') return data.message;
  if (data && typeof data === 'object') {
    const first = Object.values(data).flat()[0];
    if (typeof first === 'string') return first;
  }
  return fallback;
}
