import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AccountLayout from './AccountLayout';
import { useAuth } from '../../../context/AuthContext';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../public/PublicLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

describe('AccountLayout', () => {
  const logoutMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    logoutMock.mockResolvedValue(undefined);
    useAuth.mockReturnValue({ logout: logoutMock });
  });

  it('usa o logout centralizado da aplicação antes de voltar para a loja', async () => {
    const router = createMemoryRouter(
      [
        { path: '/my-account', element: <AccountLayout><div>Minha conta</div></AccountLayout> },
        { path: '/', element: <div>Loja</div> },
      ],
      { initialEntries: ['/my-account'] },
    );

    render(<RouterProvider router={router} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Sair' })[0]);

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalledTimes(1);
      expect(router.state.location.pathname).toBe('/');
    });
  });
});
