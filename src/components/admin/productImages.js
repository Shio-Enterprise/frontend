// Envia ao backend as mudanças de imagens feitas na tela de edição do produto.
// Cada item da lista: { key, id?, url?, file?, preview? }
//   - id sem file: imagem que já está no servidor;
//   - id com file: imagem existente que será substituída;
//   - file sem id: imagem nova.
// A ordem da lista é a ordem final; a primeira é a principal.
import { apiError } from './productForm';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const failure = async (response, prefix) => {
  const data = await response.json().catch(() => ({}));
  const reason = apiError(data.details ?? data);
  return new Error(reason ? `${prefix}: ${reason}` : `${prefix}.`);
};

// Imagens mudaram em relação ao que veio do servidor?
export const imagesChanged = (images, removedIds, original = []) => (
  removedIds.length > 0
  || images.some((item) => item.file)
  || images.map((item) => item.id).join() !== original.map((image) => image.id).join()
);

// Remove, substitui, envia as novas e grava a ordem. Se algo falhar, o erro leva
// em `error.state` o que já foi feito, para a tela não repetir o envio ao tentar de novo.
export async function syncProductImages({ productId, images, removedIds, token }) {
  const auth = { Authorization: `Bearer ${token}` };
  let current = images;
  let pending = removedIds;
  const stop = (error) => Object.assign(error, { state: { images: current, removedIds: pending } });

  for (const id of removedIds) {
    const response = await fetch(`${API_BASE_URL}/api/catalog/images/${id}/`, { method: 'DELETE', headers: auth });
    // 404: já tinha sido removida numa tentativa anterior.
    if (!response.ok && response.status !== 404) throw stop(await failure(response, 'Falha ao remover uma imagem'));
    pending = pending.filter((pendingId) => pendingId !== id);
  }

  for (const [index, item] of images.entries()) {
    if (!item.file) continue;
    const body = new FormData();
    body.append('image', item.file);
    const url = item.id
      ? `${API_BASE_URL}/api/catalog/products/${productId}/images/${item.id}/`
      : `${API_BASE_URL}/api/catalog/products/${productId}/images/`;
    const response = await fetch(url, { method: item.id ? 'PUT' : 'POST', headers: auth, body });
    if (!response.ok) throw stop(await failure(response, `Falha ao enviar a imagem ${index + 1}`));
    const saved = await response.json();
    if (item.preview) URL.revokeObjectURL(item.preview);
    current = current.map((it) => (it.key === item.key ? { key: item.key, id: saved.id, url: saved.image } : it));
  }

  // O servidor coloca as novas no fim: grava a ordem escolhida na tela.
  if (current.length > 1) {
    const response = await fetch(`${API_BASE_URL}/api/catalog/products/${productId}/images/order/`, {
      method: 'PUT',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_ids: current.map((item) => item.id) }),
    });
    if (!response.ok) throw stop(await failure(response, 'Falha ao salvar a ordem das imagens'));
  }

  return { images: current, removedIds: pending };
}
