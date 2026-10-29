import { useEffect, useRef } from 'react';

// Diálogo dos painéis de pedido no admin (reembolso, troca).
export default function AdminModal({ title, titleId, onClose, onSubmit, children, error, submitLabel, canSubmit, danger }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <form
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={onSubmit}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[18px] bg-white p-6 outline-none"
      >
        <h2 id={titleId} className="text-[20px] font-bold text-black">{title}</h2>
        {children}
        {error && <p role="alert" className="mt-3 text-[13px] text-[#cc0000]">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="h-11 whitespace-nowrap rounded-full border border-black/15 px-6 text-sm font-medium text-black transition hover:border-black"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className={`h-11 whitespace-nowrap rounded-full px-6 text-sm font-medium text-white transition disabled:opacity-40 ${danger ? 'bg-shio-danger hover:bg-shio-danger-hover' : 'bg-black hover:bg-black/80'}`}
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
