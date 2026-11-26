const pad = (n) => String(n).padStart(2, '0');

export function shortOrderId(id) {
  return `#${String(id).substring(0, 8).toUpperCase()}`;
}

export function formatOrderDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function formatOrderDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${formatOrderDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
