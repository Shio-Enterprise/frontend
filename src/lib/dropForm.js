// Lógica compartilhada dos formulários de drop (NewDropPage / EditDropPage).
// Mantém um único contrato de campos — o mesmo payload lógico é enviado como
// JSON quando não há banner novo, ou como multipart/form-data quando há.

/**
 * Valida as mesmas regras aplicadas no backend (DropCampaignSerializer):
 * end_date deve ser posterior a launch_date, e max_quantity deve ser um
 * inteiro positivo ou vazio (sem limite). Retorna uma mensagem de erro ou
 * null quando está tudo certo.
 */
export function validateDropForm({ launchDate, endDate, maxQuantity }) {
  if (launchDate && endDate && new Date(endDate) <= new Date(launchDate)) {
    return 'A data de encerramento deve ser posterior à data de lançamento.';
  }

  if (maxQuantity !== '' && maxQuantity !== null && maxQuantity !== undefined) {
    const parsed = Number(maxQuantity);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return 'O limite de unidades deve ser um número inteiro maior que zero (ou vazio, para sem limite).';
    }
  }

  return null;
}

/** Monta o payload lógico do drop a partir do estado do formulário. */
export function buildDropPayload({ name, description, launchDate, endDate, isActive, isPublic, maxQuantity }) {
  return {
    name,
    description,
    launch_date: launchDate ? new Date(launchDate).toISOString() : null,
    end_date: endDate ? new Date(endDate).toISOString() : null,
    is_active: isActive,
    is_public: isPublic,
    max_quantity:
      maxQuantity === '' || maxQuantity === null || maxQuantity === undefined
        ? null
        : Number(maxQuantity),
  };
}

/**
 * Envia o payload do drop. Usa multipart/form-data somente quando há um
 * arquivo de banner novo para enviar; caso contrário usa JSON — os dois
 * caminhos carregam exatamente os mesmos campos.
 */
export async function submitDrop(url, method, payload, bannerFile, token) {
  if (bannerFile) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        // Campo nullable: string vazia via multipart é interpretada pelo
        // DRF como None (mesmo efeito de enviar `null` no JSON).
        formData.append(key, '');
      } else if (typeof value === 'boolean') {
        formData.append(key, value ? 'true' : 'false');
      } else {
        formData.append(key, value);
      }
    });
    formData.append('banner', bannerFile);

    return fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  }

  return fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}

/**
 * Extrai uma mensagem legível de um corpo de erro da API. Prefere o detalhe
 * específico do campo (`details`, ex.: "end_date deve ser posterior a
 * launch_date.") sobre a mensagem genérica ("Dados inválidos."), que sozinha
 * não ajuda o admin a corrigir o formulário.
 */
export function flattenApiError(errorData, fallback) {
  if (!errorData) return fallback;
  if (errorData.details && typeof errorData.details === 'object') {
    const first = Object.values(errorData.details)[0];
    if (Array.isArray(first) && first.length > 0) return first[0];
    if (typeof first === 'string') return first;
  }
  if (typeof errorData.error === 'string') return errorData.error;
  if (typeof errorData.detail === 'string') return errorData.detail;
  return fallback;
}
