import Dialog from './Dialog';

// Diálogo dos painéis de pedido no admin (reembolso, troca).
export default function AdminModal({ title, titleId, onClose, onSubmit, children, error, submitLabel, canSubmit, danger }) {
  return (
    <Dialog
      as="form"
      labelledBy={titleId}
      onClose={onClose}
      onSubmit={onSubmit}
      className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[18px] bg-white p-6"
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
    </Dialog>
  );
}
