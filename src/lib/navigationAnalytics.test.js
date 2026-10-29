import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from './axios';
import { anonymousNavigationId, linkAnonymousNavigation, recordNavigationEvent } from './navigationAnalytics';

vi.mock('./axios', () => ({ default: { post: vi.fn(() => Promise.resolve()) } }));

describe('navegação da loja', () => {
  beforeEach(() => {
    localStorage.clear();
    apiClient.post.mockClear();
    vi.useRealTimers();
  });

  it('guarda um identificador anônimo estável', () => {
    const first = anonymousNavigationId();
    const second = anonymousNavigationId();

    expect(first).toBeTruthy();
    expect(second).toBe(first);
    expect(localStorage.getItem('shio_anonymous_id')).toBe(first);
  });

  it('envia a visualização de página com o identificador anônimo', () => {
    recordNavigationEvent({ eventType: 'PAGE_VIEW', path: '/cart' });

    expect(apiClient.post).toHaveBeenCalledWith('/analytics/events/', {
      event_type: 'PAGE_VIEW',
      path: '/cart',
      anonymous_id: localStorage.getItem('shio_anonymous_id'),
    });
  });

  it('não grava caminho administrativo', () => {
    recordNavigationEvent({ eventType: 'PAGE_VIEW', path: '/admin/navigation' });

    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('omite o identificador anônimo quando a conta está logada', () => {
    localStorage.setItem('accessToken', 'token');

    recordNavigationEvent({
      eventType: 'ADD_TO_CART',
      path: '/product/1',
      product: '1',
      variation: '9',
    });

    expect(apiClient.post).toHaveBeenCalledWith('/analytics/events/', {
      event_type: 'ADD_TO_CART',
      path: '/product/1',
      product: '1',
      variation: '9',
    });
  });

  it('vincula os eventos anônimos depois do login', () => {
    localStorage.setItem('shio_anonymous_id', 'anon-1');
    localStorage.setItem('accessToken', 'token');

    linkAnonymousNavigation();

    expect(apiClient.post).toHaveBeenCalledWith('/analytics/link/', { anonymous_id: 'anon-1' });
  });
});
