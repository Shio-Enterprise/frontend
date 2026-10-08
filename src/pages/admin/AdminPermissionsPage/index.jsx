import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { getAccessToken } from '../../../lib/authToken';
import { AdminPanel, AdminTitle, BlackButton, Icon, PageMarker } from '../../../components/ui/ShioDesign';

const API_BASE_URL = import.meta.env.VITE_API_URL;

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getAccessToken()}`,
  };
}

function normalizeResults(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.results ?? [];
}

export default function AdminPermissionsPage() {
  const { user, refreshUser } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [permissionOptions, setPermissionOptions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedAdmin = useMemo(
    () => admins.find((admin) => String(admin.id) === String(selectedId)) ?? null,
    [admins, selectedId],
  );

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const [adminsResponse, permissionsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/auth/admins/`, { headers: authHeaders() }),
          fetch(`${API_BASE_URL}/api/auth/admins/permissions/`, { headers: authHeaders() }),
        ]);

        if (!adminsResponse.ok || !permissionsResponse.ok) {
          throw new Error('Não foi possível carregar as permissões administrativas.');
        }

        const adminsPayload = await adminsResponse.json();
        const permissionsPayload = await permissionsResponse.json();
        if (cancelled) return;

        const loadedAdmins = normalizeResults(adminsPayload);
        const loadedPermissions = normalizeResults(permissionsPayload);
        const initialAdmin = loadedAdmins[0] ?? null;

        setAdmins(loadedAdmins);
        setPermissionOptions(loadedPermissions);
        setSelectedId(initialAdmin?.id ?? null);
        setSelectedPermissions(initialAdmin?.admin_permissions ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Não foi possível carregar as permissões administrativas.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectAdmin = (admin) => {
    setSelectedId(admin.id);
    setSelectedPermissions(admin.admin_permissions ?? []);
    setSuccess('');
    setError('');
  };

  const filteredAdmins = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return admins;
    return admins.filter((admin) =>
      `${admin.name ?? ''} ${admin.email ?? ''}`.toLowerCase().includes(value),
    );
  }, [admins, search]);

  const isCurrentUser = selectedAdmin && String(selectedAdmin.id) === String(user?.id);
  const isSuperuser = Boolean(selectedAdmin?.is_superuser);
  const originalPermissions = selectedAdmin?.admin_permissions ?? [];
  const hasChanges =
    [...selectedPermissions].sort().join('|') !== [...originalPermissions].sort().join('|');

  const togglePermission = (code) => {
    if (isSuperuser) return;
    if (isCurrentUser && code === 'manage_admin_permissions') return;

    setSelectedPermissions((current) =>
      current.includes(code)
        ? current.filter((permission) => permission !== code)
        : [...current, code],
    );
    setSuccess('');
  };

  const savePermissions = async () => {
    if (!selectedAdmin || !hasChanges || isSuperuser) return;
    if (selectedPermissions.length === 0) {
      setError('Selecione ao menos uma permissão para esta conta administrativa.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/admins/${selectedAdmin.id}/`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ admin_permissions: selectedPermissions }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          payload?.admin_permissions?.[0] ||
          payload?.detail ||
          'Não foi possível salvar as permissões.';
        throw new Error(message);
      }

      setAdmins((current) =>
        current.map((admin) => (String(admin.id) === String(payload.id) ? payload : admin)),
      );
      setSelectedPermissions(payload.admin_permissions ?? []);
      if (String(payload.id) === String(user?.id)) {
        await refreshUser?.();
      }
      setSuccess('Permissões atualizadas com sucesso.');
    } catch (err) {
      setError(err.message || 'Não foi possível salvar as permissões.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageMarker name="AdminPermissionsPage" />
      <AdminTitle
        eyebrow="Controle de acesso"
        title="Permissões administrativas"
      />

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <AdminPanel className="overflow-hidden">
          <div className="border-b border-black/10 p-5">
            <h2 className="text-[18px] font-bold text-black">Administradores</h2>
            <p className="mt-1 text-[13px] text-black/55">
              Selecione uma conta para revisar o acesso ao painel.
            </p>
            <label className="mt-4 flex h-11 items-center gap-3 rounded-full bg-[#f0f0f0] px-4 text-black/45">
              <Icon name="search" className="h-4 w-4" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar administrador..."
                className="w-full bg-transparent text-sm text-black outline-none placeholder:text-black/35"
              />
            </label>
          </div>

          {loading ? (
            <p className="p-5 text-sm text-black/55">Carregando administradores...</p>
          ) : filteredAdmins.length === 0 ? (
            <p className="p-5 text-sm text-black/55">Nenhum administrador encontrado.</p>
          ) : (
            <div className="max-h-[560px] overflow-y-auto p-2">
              {filteredAdmins.map((admin) => {
                const active = String(admin.id) === String(selectedId);
                return (
                  <button
                    key={admin.id}
                    type="button"
                    onClick={() => selectAdmin(admin)}
                    className={`w-full rounded-[14px] px-4 py-3 text-left transition ${
                      active ? 'bg-black text-white' : 'hover:bg-black/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{admin.name || admin.email}</p>
                        <p className={`mt-0.5 truncate text-xs ${active ? 'text-white/65' : 'text-black/50'}`}>
                          {admin.email}
                        </p>
                      </div>
                      {admin.is_superuser && (
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${active ? 'bg-white/15 text-white' : 'bg-black/10 text-black/65'}`}>
                          Superuser
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </AdminPanel>

        <AdminPanel className="overflow-hidden">
          {!selectedAdmin ? (
            <div className="p-8 text-sm text-black/55">Selecione um administrador.</div>
          ) : (
            <>
              <div className="flex flex-col gap-4 border-b border-black/10 p-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-[13px] font-semibold uppercase tracking-wide text-black/45">
                    Conta selecionada
                  </p>
                  <h2 className="mt-1 text-[22px] font-bold text-black">
                    {selectedAdmin.name || selectedAdmin.email}
                  </h2>
                  <p className="mt-1 text-sm text-black/55">{selectedAdmin.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {isCurrentUser && (
                    <span className="rounded-full bg-[#f0f0f0] px-3 py-1.5 text-xs font-semibold text-black/65">
                      Sua conta
                    </span>
                  )}
                  {isSuperuser && (
                    <span className="rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white">
                      Superusuário
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6">
                {isSuperuser && (
                  <div className="mb-5 rounded-[14px] border border-black/10 bg-[#f7f7f7] px-4 py-3 text-sm text-black/65">
                    Superusuários possuem todas as permissões automaticamente. Para segurança, elas não podem ser alteradas por esta tela.
                  </div>
                )}

                <div className="divide-y divide-black/10 rounded-[16px] border border-black/10">
                  {permissionOptions.map((permission) => {
                    const checked = isSuperuser || selectedPermissions.includes(permission.code);
                    const locked = isSuperuser || (isCurrentUser && permission.code === 'manage_admin_permissions');
                    return (
                      <label
                        key={permission.code}
                        className={`flex gap-4 p-5 ${locked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-black/[0.02]'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={locked}
                          onChange={() => togglePermission(permission.code)}
                          className="mt-1 h-4 w-4 accent-black"
                        />
                        <span className="min-w-0">
                          <span className="block text-[15px] font-semibold text-black">
                            {permission.label}
                          </span>
                          <span className="mt-1 block text-[13px] leading-5 text-black/55">
                            {permission.description}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>

                {isCurrentUser && !isSuperuser && (
                  <p className="mt-3 text-xs text-black/45">
                    A permissão de gerenciar administradores não pode ser removida da própria conta nesta tela.
                  </p>
                )}

                {error && (
                  <p role="alert" className="mt-5 rounded-[12px] bg-[#fff0f0] px-4 py-3 text-sm text-[#b00020]">
                    {error}
                  </p>
                )}
                {success && (
                  <p className="mt-5 rounded-[12px] bg-[#eef9f1] px-4 py-3 text-sm text-[#176b35]">
                    {success}
                  </p>
                )}

                <div className="mt-6 flex justify-end">
                  <BlackButton
                    onClick={savePermissions}
                    disabled={!hasChanges || saving || isSuperuser}
                  >
                    <Icon name="save" className="h-4 w-4" />
                    {saving ? 'Salvando...' : 'Salvar permissões'}
                  </BlackButton>
                </div>
              </div>
            </>
          )}
        </AdminPanel>
      </div>
    </div>
  );
}
