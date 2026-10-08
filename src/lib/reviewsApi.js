import apiClient from './axios';

const MY_REVIEWS_PAGE_SIZE = 50;

function compact(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );
}

// O backend rejeita qualquer campo além destes (mass assignment -> 400).
function reviewFields({ rating, comment, fit }) {
  return { rating, comment, fit };
}

export async function getProductReviews(productId, { rating, page = 1 } = {}) {
  const { data } = await apiClient.get(`/reviews/products/${productId}/`, { params: compact({ rating, page }) });
  return data;
}

export async function getReviewSummary(productId) {
  const { data } = await apiClient.get(`/reviews/products/${productId}/summary/`);
  return data;
}

export async function createReview(productId, review) {
  const { data } = await apiClient.post(`/reviews/products/${productId}/`, reviewFields(review));
  return data;
}

export async function updateReview(reviewId, review) {
  const { data } = await apiClient.patch(`/reviews/${reviewId}/`, reviewFields(review));
  return data;
}

export async function deleteReview(reviewId) {
  await apiClient.delete(`/reviews/${reviewId}/`);
}

export async function getAllMyReviews() {
  const reviews = [];
  let page = 1;
  let hasNext = true;
  while (hasNext) {
    const { data } = await apiClient.get('/reviews/mine/', { params: { page, page_size: MY_REVIEWS_PAGE_SIZE } });
    reviews.push(...data.results);
    hasNext = Boolean(data.next);
    page += 1;
  }
  return reviews;
}

export async function getAdminReviews({ status, rating, product, page = 1 } = {}) {
  const { data } = await apiClient.get('/reviews/admin/', { params: compact({ status, rating, product, page }) });
  return data;
}

export async function removeReview(reviewId, { reason, note }) {
  const { data } = await apiClient.post(`/reviews/admin/${reviewId}/remove/`, { reason, note });
  return data;
}

export async function restoreReview(reviewId) {
  const { data } = await apiClient.post(`/reviews/admin/${reviewId}/restore/`);
  return data;
}

export async function setReply(reviewId, text) {
  const { data } = await apiClient.put(`/reviews/admin/${reviewId}/reply/`, { text });
  return data;
}

export async function clearReply(reviewId) {
  const { data } = await apiClient.delete(`/reviews/admin/${reviewId}/reply/`);
  return data;
}

export function reviewErrorMessage(error, fallback = 'Não foi possível salvar a avaliação.') {
  const status = error?.response?.status;
  const data = error?.response?.data;
  if (status === 429) return 'Você enviou muitas avaliações em pouco tempo. Tente de novo mais tarde.';
  if (typeof data?.message === 'string') return data.message;
  if (data && typeof data === 'object') {
    const first = Object.values(data).flat()[0];
    if (typeof first === 'string') return first;
  }
  return fallback;
}
