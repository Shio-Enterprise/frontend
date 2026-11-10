import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adminAccountErrorMessage,
  createAdmin,
  lookupAdminEmail,
  removeAdminAccess,
} from './adminAccounts';

vi.mock('./authToken', () => ({ getAccessToken: () => 'access-token' }));

function response(payload, { ok = true, status = 200 } = {}) {
  return Promise.resolve({ ok, status, json: () => Promise.resolve(payload) });
}

describe('adminAccounts', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  it('lookup manda o e-mail sem espaços e com token', async () => {
    globalThis.fetch.mockReturnValueOnce(response({ exists: false, email: 'a@b.com' }));
    const result = await lookupAdminEmail('  a@b.com ');
    expect(result.exists).toBe(false);
    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toContain('/api/auth/admins/lookup/?email=a%40b.com');
    expect(options.headers.Authorization).toBe('Bearer access-token');
  });

  it('createAdmin só manda o nome quando informado', async () => {
    globalThis.fetch.mockReturnValue(response({ id: 1 }));
    await createAdmin({ email: 'a@b.com', name: '  ', adminPermissions: ['manage_drops'] });
    await createAdmin({ email: 'c@d.com', name: ' Ana ', adminPermissions: ['manage_orders'] });

    const [url, first] = globalThis.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/auth\/admins\/$/);
    expect(first.method).toBe('POST');
    expect(JSON.parse(first.body)).toEqual({ email: 'a@b.com', admin_permissions: ['manage_drops'] });
    expect(JSON.parse(globalThis.fetch.mock.calls[1][1].body)).toEqual({
      email: 'c@d.com',
      admin_permissions: ['manage_orders'],
      name: 'Ana',
    });
  });

  it('erro da API vira mensagem do campo', async () => {
    globalThis.fetch.mockReturnValueOnce(
      response({ email: ['Este e-mail já pertence a um administrador.'] }, { ok: false, status: 400 }),
    );
    await expect(
      createAdmin({ email: 'a@b.com', adminPermissions: ['manage_drops'] }),
    ).rejects.toThrow('Este e-mail já pertence a um administrador.');
  });

  it('removeAdminAccess usa DELETE e aceita 204 sem corpo', async () => {
    globalThis.fetch.mockReturnValueOnce(
      Promise.resolve({ ok: true, status: 204, json: () => Promise.reject(new Error('sem corpo')) }),
    );
    await expect(removeAdminAccess(7)).resolves.toBeNull();
    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/auth\/admins\/7\/$/);
    expect(options.method).toBe('DELETE');
  });

  it('removeAdminAccess mostra o detail do backend', async () => {
    globalThis.fetch.mockReturnValueOnce(
      response({ detail: 'Você não pode remover o seu próprio acesso.' }, { ok: false, status: 400 }),
    );
    await expect(removeAdminAccess(1)).rejects.toThrow('Você não pode remover o seu próprio acesso.');
  });

  it('adminAccountErrorMessage cai no texto padrão', () => {
    expect(adminAccountErrorMessage(null, 'Padrão')).toBe('Padrão');
    expect(adminAccountErrorMessage({ outro: ['x'] }, 'Padrão')).toBe('Padrão');
    expect(adminAccountErrorMessage({ name: ['Nome?'] }, 'Padrão')).toBe('Nome?');
  });
});
