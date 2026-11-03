import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { downloadFile } from '../../lib/downloadFile';
import { Icon } from '../ui/ShioDesign';

const GENERIC_ERROR = 'Não foi possível exportar os dados. Tente novamente.';

// Com responseType 'blob', o corpo de erro da API chega como Blob
async function getErrorMessage(err) {
  let data = err.response?.data;
  if (data instanceof Blob) {
    try {
      data = JSON.parse(await data.text());
    } catch {
      data = null;
    }
  }
  return data?.detail || data?.message || GENERIC_ERROR;
}

export default function ExportButton({
  endpoint,
  params = {},
  fallbackFilename = 'exportacao',
  label = 'Exportar',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  const buttonRef = useRef(null);

  const handleToggle = () => {
    if (loading) return;
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((prev) => !prev);
  };

  const handleExport = async (format) => {
    setOpen(false);
    setLoading(true);
    setError(null);

    try {
      await downloadFile(
        endpoint,
        { ...params, file_format: format },
        `${fallbackFilename}.${format}`
      );
    } catch (err) {
      setError(await getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Fecha menu ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  const menu = open ? (
    <div
      role="menu"
      aria-label="Opções de exportação"
      className="fixed z-50 min-w-[170px] overflow-hidden rounded-[12px] border border-black/10 bg-white py-1 shadow-xl transition-all"
      style={{ top: menuPos.top, right: menuPos.right }}
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => handleExport('csv')}
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] font-medium text-black transition hover:bg-black/5"
      >
        <span className="font-semibold text-black/70">CSV</span>
        <span className="text-xs text-shio-muted">(.csv)</span>
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={() => handleExport('xlsx')}
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] font-medium text-black transition hover:bg-black/5"
      >
        <span className="font-semibold text-black/70">Excel</span>
        <span className="text-xs text-shio-muted">(.xlsx)</span>
      </button>
    </div>
  ) : null;

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={loading}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={label}
        className="flex h-10 items-center gap-2 rounded-lg border border-black/20 bg-white px-4 text-sm font-semibold text-black transition hover:border-black/40 hover:bg-black/[0.02] disabled:opacity-50"
      >
        <Icon
          name={loading ? 'refresh' : 'download'}
          className={`h-4 w-4 shrink-0 ${loading ? 'animate-spin' : ''}`}
        />
        <span>{loading ? 'Exportando...' : label}</span>
      </button>

      {createPortal(menu, document.body)}

      {error && (
        <div
          role="alert"
          className="absolute right-0 top-full z-20 mt-2 w-72 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-shio-danger hover:text-red-800"
              aria-label="Fechar erro"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
