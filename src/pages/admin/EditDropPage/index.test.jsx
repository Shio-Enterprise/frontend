import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EditDropPage from './index';

vi.mock('../../../hooks/useApi', () => ({
  useApi: () => ({
    data: {
      id: '1',
      name: 'Drop Teste',
      description: 'Descrição do drop',
      launch_date: '2024-06-01T00:00:00Z',
      is_active: true,
    },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('EditDropPage', () => {
  it('renders headline', () => {
    render(
      <MemoryRouter initialEntries={['/admin/edit-drop/1']}>
        <Routes>
          <Route path="/admin/edit-drop/:id" element={<EditDropPage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
