import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CustomersPage from './index';

const { useApiMock } = vi.hoisted(() => ({ useApiMock: vi.fn() }));

vi.mock('../../../hooks/useApi', () => ({
  useApi: useApiMock,
}));

describe('CustomersPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useApiMock.mockReturnValue({ data: [], loading: false, error: null, refetch: vi.fn() });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('envia a busca por nome ou e-mail para o endpoint do CRM', () => {
    render(<MemoryRouter><CustomersPage /></MemoryRouter>);

    const search = screen.getByPlaceholderText('Buscar por nome ou e-mail...');
    fireEvent.change(search, { target: { value: 'Maria Silva' } });
    act(() => vi.advanceTimersByTime(300));

    expect(useApiMock).toHaveBeenLastCalledWith(
      '/api/auth/crm/customers/?search=Maria%20Silva',
    );
  });
});
