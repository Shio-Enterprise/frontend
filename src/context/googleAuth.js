import apiClient from '../lib/axios';

/**
 * Envia o token do Google para o backend para autenticação.
 * @param {string} idToken O ID token do Google Sign-In.
 * @returns {Promise<object>} A resposta do backend com dados do usuário e tokens JWT.
 */
export const loginWithGoogle = async (idToken) => {
  try {
    // withCredentials: manda o cookie da sessão para o backend juntar o carrinho do visitante.
    const response = await apiClient.post('/auth/google/', {
      id_token: idToken,
    }, { withCredentials: true });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.details || 'Erro ao fazer login com o Google.');
  }
};