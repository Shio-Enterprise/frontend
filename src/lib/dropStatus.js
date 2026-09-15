// Único mapeamento de estado visual de um drop, usado por DropsPage e
// DropDetailsPage — substitui os dois cálculos divergentes que existiam
// antes. Lê `is_visible` e `is_sellable` diretamente da API (calculados no
// backend por products.availability, issue #6) em vez de recalcular a
// política de datas/limite em JS; `is_active`/`is_public`/`launch_date` só
// são usados aqui para escolher a *mensagem* mais específica ao admin (por
// que o drop está oculto), nunca para decidir a disponibilidade em si.

const STATUS = {
  draft: { label: 'Rascunho', color: 'text-[#c8970a]', badgeColor: '#c8970a' },
  private: { label: 'Privado', color: 'text-black/50', badgeColor: '#888888' },
  scheduled: { label: 'Programado', color: 'text-[#1d4ed8]', badgeColor: '#1d4ed8' },
  ended: { label: 'Encerrado', color: 'text-black/45', badgeColor: '#888888' },
  sold_out: { label: 'Esgotado', color: 'text-black/45', badgeColor: '#888888' },
  active: { label: 'Ativo', color: 'text-[#00a651]', badgeColor: '#00a651' },
  unknown: { label: 'Desconhecido', color: 'text-black/40', badgeColor: '#999999' },
};

export function getDropStatus(drop) {
  if (!drop) return { key: 'unknown', ...STATUS.unknown };

  const now = new Date();
  const launch = drop.launch_date ? new Date(drop.launch_date) : null;
  const end = drop.end_date ? new Date(drop.end_date) : null;

  if (!drop.is_active) return { key: 'draft', ...STATUS.draft };
  if (!drop.is_public) return { key: 'private', ...STATUS.private };
  if (launch && launch > now) return { key: 'scheduled', ...STATUS.scheduled };
  if (end && end < now) return { key: 'ended', ...STATUS.ended };
  if (drop.is_sellable === false) return { key: 'sold_out', ...STATUS.sold_out };
  return { key: 'active', ...STATUS.active };
}
