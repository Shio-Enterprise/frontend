import apiClient from './axios';

/**
 * Realiza o download de arquivos protegidos por autenticação na API.
 * Lê o header Content-Disposition para extrair o nome do arquivo.
 *
 * @param {string} endpoint - Rota da API (ex: '/orders/admin/export/' ou '/api/orders/admin/export/')
 * @param {Record<string, any>} [params={}] - Parâmetros de consulta (filtros, busca, file_format)
 * @param {string} [fallbackFilename='exportacao'] - Nome padrão caso não venha no cabeçalho
 * @returns {Promise<string>} Nome do arquivo baixado
 */
export async function downloadFile(endpoint, params = {}, fallbackFilename = 'exportacao') {
  const normalizedEndpoint = endpoint.startsWith('/api') ? endpoint.slice(4) : endpoint;

  const response = await apiClient.get(normalizedEndpoint, {
    params,
    responseType: 'blob',
  });

  const contentDisposition =
    response.headers?.['content-disposition'] ||
    (typeof response.headers?.get === 'function' ? response.headers.get('content-disposition') : '') ||
    '';

  let filename = fallbackFilename;
  const utf8Match = contentDisposition.match(/filename\*=utf-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      filename = decodeURIComponent(utf8Match[1]);
    } catch {
      filename = utf8Match[1];
    }
  } else {
    const regularMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
    if (regularMatch?.[1]) {
      filename = regularMatch[1];
    }
  }

  const blob = new Blob([response.data], {
    type: response.headers?.['content-type'] || 'application/octet-stream',
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  return filename;
}

export default downloadFile;
