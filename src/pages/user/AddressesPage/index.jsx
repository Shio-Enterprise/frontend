import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AccountLayout from '../../../components/layout/user/AccountLayout';
import { Icon, PageMarker } from '../../../components/ui/ShioDesign';
import { getAccessToken } from '../../../lib/authToken';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const AddressesPage = () => {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  const loadAddresses = useCallback(async () => {
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_BASE_URL}/api/auth/addresses/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAddresses(Array.isArray(data) ? data : data.results ?? []);
      }
    } catch {}
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAddresses(); }, [loadAddresses]);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const token = getAccessToken();
      await fetch(`${API_BASE_URL}/api/auth/addresses/${id}/`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setError('Falha ao excluir endereço.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AccountLayout>
      <PageMarker name="AddressesPage" />

      <div className="mb-9 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[34px] font-black uppercase text-black">Meus Endereços</h1>
        <Link
          to="/new-address"
          className="inline-flex h-12 items-center justify-center gap-3 rounded-[10px] bg-black px-7 text-[15px] font-bold uppercase text-white transition hover:bg-black/85"
        >
          <Icon name="plus" className="h-5 w-5" />
          Novo Endereço
        </Link>
      </div>

      {error && (
        <div className="mb-5 rounded-[10px] bg-red-50 px-4 py-3 text-[13px] text-[#cc0000]">{error}</div>
      )}

      {loading ? (
        <p className="text-black/40">Carregando...</p>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-[18px] border border-black/10 px-8 py-20 text-center">
          <Icon name="tag" className="h-16 w-16 text-black/20" />
          <p className="mt-6 text-[22px] font-bold text-black">Nenhum endereço cadastrado</p>
          <p className="mt-3 max-w-sm text-[16px] text-black/45">
            Cadastre um endereço para agilizar suas compras.
          </p>
          <Link to="/new-address"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-black px-8 text-[14px] font-bold uppercase text-white transition hover:bg-black/85">
            Adicionar endereço
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => (
            <div key={addr.id}
              className="relative rounded-[18px] border border-black/10 p-6">
              {addr.is_default && (
                <span className="mb-3 inline-block rounded-full bg-[#d4f7e2] px-3 py-1 text-[12px] font-semibold text-[#1da64a]">
                  Padrão
                </span>
              )}
              <p className="text-[17px] font-bold text-black">{addr.title}</p>
              <p className="mt-1 text-[14px] text-black/60">
                {addr.street}, {addr.address_number}
                {addr.complement ? `, ${addr.complement}` : ''}
              </p>
              <p className="text-[14px] text-black/60">
                {addr.neighborhood} — {addr.city}/{addr.state}
              </p>
              <p className="text-[14px] text-black/45">{addr.zip_code}</p>

              <button
                onClick={() => handleDelete(addr.id)}
                disabled={deletingId === addr.id}
                className="absolute right-5 top-5 text-black/25 transition hover:text-[#ff3333] disabled:opacity-40"
                aria-label="Excluir endereço"
              >
                <Icon name="trash" className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </AccountLayout>
  );
};

export default AddressesPage;
