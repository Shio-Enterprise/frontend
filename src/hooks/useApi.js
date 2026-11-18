import { useState, useEffect, useCallback } from 'react';
import { getAccessToken } from '../lib/authToken';

const API_BASE_URL = import.meta.env.VITE_API_URL;

/**
 * Custom hook for making authenticated API requests.
 * @param {string} url - The API endpoint to call (e.g., '/api/auth/crm/customers/').
 * @param {object} options - Optional fetch options.
 * @returns {{data: any, loading: boolean, error: Error|null, refetch: function}}
 */
export const useApi = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No authentication token found.');
      }

      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [url, JSON.stringify(options)]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

// Limite de segurança contra um laço sem fim se a API devolver sempre `next`.
const MAX_PAGES = 100;

/**
 * Igual ao useApi, mas para listas paginadas que o admin precisa ver inteiras
 * (ex.: drops e categorias, #104): busca page=1, 2, ... até não haver `next`.
 * Devolve `{ count, results }` com todos os itens, para quem já lê `.results`.
 * @param {string} url - Endpoint paginado (ex.: '/api/catalog/drops/').
 */
export const useApiAll = (url) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('No authentication token found.');
      }

      const separator = url.includes('?') ? '&' : '?';
      const items = [];
      for (let page = 1; page <= MAX_PAGES; page += 1) {
        const response = await fetch(`${API_BASE_URL}${url}${separator}page=${page}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (Array.isArray(result)) {
          items.push(...result);
          break;
        }
        items.push(...(result.results ?? []));
        if (!result.next) break;
      }

      // Um item criado durante a busca empurra os outros uma posição e
      // apareceria duas vezes (fim de uma página e início da seguinte).
      const seen = new Set();
      const results = items.filter((item) => {
        if (item?.id == null) return true;
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      setData({ count: results.length, results });
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};
