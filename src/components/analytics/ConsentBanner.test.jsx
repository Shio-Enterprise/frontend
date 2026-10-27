import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ConsentBanner from './ConsentBanner';
import { ANONYMOUS_ID_KEY, CONSENT_KEY, getAnonymousId, setAnalyticsConsent } from '../../lib/analytics';

const renderBanner = (path = '/produtos') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ConsentBanner />
    </MemoryRouter>,
  );

describe('ConsentBanner', () => {
  let fetchMock;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn(() => Promise.resolve({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
  });

  it('aparece quando o visitante ainda não respondeu', () => {
    renderBanner();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('não aparece quando a escolha já foi feita', () => {
    setAnalyticsConsent('denied');

    renderBanner();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('ao aceitar, grava o consentimento, some e registra a página atual', () => {
    renderBanner('/produtos');

    fireEvent.click(screen.getByRole('button', { name: 'Aceitar' }));

    expect(localStorage.getItem(CONSENT_KEY)).toBe('granted');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      event_type: 'PAGE_VIEW',
      path: '/produtos',
    });
  });

  it('ao recusar, grava a recusa, some e não envia nada', () => {
    renderBanner();

    fireEvent.click(screen.getByRole('button', { name: 'Recusar' }));

    expect(localStorage.getItem(CONSENT_KEY)).toBe('denied');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ao recusar, apaga o identificador anônimo já guardado', () => {
    getAnonymousId();
    expect(localStorage.getItem(ANONYMOUS_ID_KEY)).not.toBeNull();
    renderBanner();

    fireEvent.click(screen.getByRole('button', { name: 'Recusar' }));

    expect(localStorage.getItem(ANONYMOUS_ID_KEY)).toBeNull();
  });
});
