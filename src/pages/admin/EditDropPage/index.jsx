import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../../../hooks/useApi';
import { getAccessToken } from '../../../lib/authToken';
import { buildDropPayload, flattenApiError, submitDrop, validateDropForm } from '../../../lib/dropForm';
import { AdminPanel, Icon, PageMarker } from '../../../components/ui/ShioDesign';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const getInitialDate = (dateString) => (dateString ? dateString.split('T')[0] : '');

const EditDropForm = ({ dropId, initialData }) => {
  const navigate = useNavigate();
  const [name, setName] = useState(initialData.name || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [launchDate, setLaunchDate] = useState(getInitialDate(initialData.launch_date));
  const [endDate, setEndDate] = useState(getInitialDate(initialData.end_date));
  const [isActive, setIsActive] = useState(initialData.is_active);
  const [isPublic, setIsPublic] = useState(initialData.is_public ?? true);
  const [maxQuantity, setMaxQuantity] = useState(
    initialData.max_quantity === null || initialData.max_quantity === undefined ? '' : String(initialData.max_quantity)
  );
  const [banner, setBanner] = useState(null);
  const [removeExistingBanner, setRemoveExistingBanner] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const bannerInputRef = useRef(null);

  const handleBannerSelect = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('O banner não pode passar de 5MB.');
      return;
    }
    if (banner) URL.revokeObjectURL(banner.preview);
    setBanner({ file, preview: URL.createObjectURL(file) });
    setRemoveExistingBanner(false);
  };

  const removeBanner = () => {
    if (banner) URL.revokeObjectURL(banner.preview);
    setBanner(null);
    setRemoveExistingBanner(true);
  };

  const currentBannerUrl = banner ? banner.preview : (!removeExistingBanner ? initialData.banner : null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    const validationError = validateDropForm({ launchDate, endDate, maxQuantity });
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setIsSubmitting(true);

    const payload = buildDropPayload({
      name, description, launchDate, endDate, isActive, isPublic, maxQuantity,
    });
    // Remover o banner existente sem enviar um novo arquivo: não há upload
    // multipart aqui, só um PUT JSON comum com banner explicitamente nulo.
    if (removeExistingBanner && !banner?.file) {
      payload.banner = null;
    }

    try {
      const token = getAccessToken();
      if (!token) throw new Error('Token de autenticação não encontrado.');

      const response = await submitDrop(
        `${API_BASE_URL}/api/catalog/drops/${dropId}/`, 'PUT', payload, banner?.file, token
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(flattenApiError(errorData, 'Falha ao atualizar o drop.'));
      }

      navigate('/admin/drops');
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <PageMarker name="EditDropPage" />

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/drops')}
            aria-label="Voltar para drops"
            className="text-black transition hover:text-black/60"
          >
            <Icon name="arrowLeft" className="h-6 w-6 md:h-7 md:w-7" />
          </button>
          <h1 className="text-[24px] font-black uppercase leading-tight text-black md:text-[34px]">Editar Drop</h1>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/admin/drops/${dropId}`)}
          aria-label="Fechar"
          className="text-black transition hover:text-black/60"
        >
          <Icon name="x" className="h-6 w-6 md:h-7 md:w-7" />
        </button>
      </div>

      <AdminPanel className="max-w-[900px] p-5 md:p-8">
        <form onSubmit={handleSubmit} className="grid gap-8">
          <label>
            <span className="text-[13px] uppercase text-black/55 md:text-[20px]">Nome do drop</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-4 h-11 w-full rounded-full border border-black/20 px-5 text-[14px] outline-none focus:border-black md:h-12 md:text-[18px]"
            />
          </label>
          <label>
            <span className="text-[13px] uppercase text-black/55 md:text-[20px]">Descrição</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-4 min-h-[150px] w-full rounded-[18px] border border-black/20 px-5 py-4 text-[14px] outline-none focus:border-black md:text-[18px]"
            />
          </label>
          <div className="grid gap-8 md:grid-cols-2">
            <label>
              <span className="text-[13px] uppercase text-black/55 md:text-[20px]">Data de lançamento</span>
              <input
                type="date"
                value={launchDate}
                onChange={(e) => setLaunchDate(e.target.value)}
                className="mt-4 h-11 w-full rounded-full border border-black/20 px-5 text-[14px] outline-none focus:border-black md:h-12 md:text-[18px]"
              />
            </label>
            <label>
              <span className="text-[13px] uppercase text-black/55 md:text-[20px]">Data de encerramento</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-4 h-11 w-full rounded-full border border-black/20 px-5 text-[14px] outline-none focus:border-black md:h-12 md:text-[18px]"
              />
            </label>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <label>
              <span className="text-[13px] uppercase text-black/55 md:text-[20px]">Status</span>
              <select
                value={isActive ? 'true' : 'false'}
                onChange={(e) => setIsActive(e.target.value === 'true')}
                className="mt-4 h-11 w-full rounded-full border border-black/20 bg-white px-5 text-[14px] outline-none focus:border-black md:h-12 md:text-[18px]"
              >
                <option value="true">Ativo</option>
                <option value="false">Rascunho</option>
              </select>
            </label>
            <label>
              <span className="text-[13px] uppercase text-black/55 md:text-[20px]">Visibilidade</span>
              <select
                value={isPublic ? 'true' : 'false'}
                onChange={(e) => setIsPublic(e.target.value === 'true')}
                className="mt-4 h-11 w-full rounded-full border border-black/20 bg-white px-5 text-[14px] outline-none focus:border-black md:h-12 md:text-[18px]"
              >
                <option value="true">Público</option>
                <option value="false">Privado</option>
              </select>
            </label>
          </div>

          <label>
            <span className="text-[13px] uppercase text-black/55 md:text-[20px]">Limite de unidades (Opcional)</span>
            <input
              type="number"
              min="1"
              step="1"
              value={maxQuantity}
              onChange={(e) => setMaxQuantity(e.target.value)}
              placeholder="Sem limite"
              className="mt-4 h-11 w-full rounded-full border border-black/20 px-5 text-[14px] outline-none placeholder:text-black/40 focus:border-black md:h-12 md:text-[18px]"
            />
          </label>

          <div>
            <span className="text-[13px] uppercase text-black/55 md:text-[20px]">Banner</span>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleBannerSelect}
            />
            {currentBannerUrl ? (
              <div className="relative mt-4 overflow-hidden rounded-[18px] border border-black/15">
                <img src={currentBannerUrl} alt="" className="h-[160px] w-full object-cover" />
                <div className="absolute right-2 top-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className="rounded-full bg-black/60 px-3 py-1 text-[12px] font-semibold text-white transition hover:bg-black"
                  >
                    Substituir
                  </button>
                  <button
                    type="button"
                    onClick={removeBanner}
                    aria-label="Remover banner"
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black"
                  >
                    <Icon name="close" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => bannerInputRef.current?.click()}
                className="mt-4 flex h-[88px] w-full items-center justify-center gap-3 rounded-[18px] border border-dashed border-black/25 text-[15px] text-black/45 transition hover:border-black/50 hover:text-black/65"
              >
                <Icon name="plus" className="h-5 w-5" />
                Adicionar banner
              </button>
            )}
          </div>

          {submitError && <p className="text-center text-red-500">{submitError}</p>}
          <button
            type="button"
            onClick={() => navigate(`/admin/drops/${dropId}`)}
            className="flex h-20 items-center justify-center gap-3 rounded-[18px] border border-dashed border-black/25 text-[18px] font-semibold text-black/55 transition hover:border-black hover:text-black"
          >
            <Icon name="plus" className="h-5 w-5" />
            Gerenciar produtos do drop
          </button>
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => navigate(`/admin/drops/${dropId}`)}
              className="flex h-12 w-full items-center justify-center rounded-full border border-black/25 text-[15px] font-bold uppercase text-black/55 transition hover:border-black hover:text-black"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-12 w-full items-center justify-center gap-4 rounded-full bg-black text-[15px] font-bold uppercase text-white transition hover:bg-black/85 disabled:cursor-not-allowed disabled:bg-black/45"
            >
              <Icon name="save" className="h-5 w-5" />
              {isSubmitting ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </AdminPanel>
    </div>
  );
};

const EditDropPage = () => {
  const { id: dropId } = useParams();
  const { data: initialData, loading: isLoadingData, error: fetchError } = useApi(`/api/catalog/drops/${dropId}/`);

  if (isLoadingData) return <div className="p-8 text-center">Carregando dados do drop...</div>;
  if (fetchError) return <div className="p-8 text-center text-red-500">Erro ao carregar os dados. Verifique o ID e tente novamente.</div>;
  if (!initialData) return <div className="p-8 text-center">Drop não encontrado.</div>;

  return <EditDropForm dropId={dropId} initialData={initialData} />;
};

export default EditDropPage;
