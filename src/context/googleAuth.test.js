import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from '../lib/axios';
import { loginWithGoogle } from './googleAuth';

vi.mock('../lib/axios', () => ({ default: { post: vi.fn() } }));

describe('loginWithGoogle', () => {
  beforeEach(() => apiClient.post.mockReset());

  it('envia o cookie da sessão para o backend juntar o carrinho do visitante', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { access: 'a' } });
    await expect(loginWithGoogle('token')).resolves.toEqual({ access: 'a' });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/auth/google/',
      { id_token: 'token' },
      { withCredentials: true },
    );
  });
});
