import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomepagePage from './index';

vi.mock('../../../lib/authToken', () => ({ getAccessToken: () => 'token' }));

const banner = { id: 'b1', image_desktop: '/one.png', image_mobile: null, alt_text: 'Campanha', link: '/drop/novo', display_order: 0 };
const reply = (body, status = 200) => Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });

describe('HomepagePage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((url) => url.includes('/admin/')
      ? reply({ tagline: 'Frase atual', banners: [banner] }) : reply({})));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('loads the phrase and registered banners', async () => {
    render(<MemoryRouter><HomepagePage /></MemoryRouter>);
    expect(await screen.findByText('Campanha')).toBeInTheDocument();
    expect(screen.getByLabelText('Frase da faixa')).toHaveValue('Frase atual');
  });

  it('sends a separate request when saving the phrase', async () => {
    render(<MemoryRouter><HomepagePage /></MemoryRouter>);
    await screen.findByText('Campanha');
    fireEvent.change(screen.getByLabelText('Frase da faixa'), { target: { value: 'Frase nova' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar frase' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/homepage/tagline/'), expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ tagline: 'Frase nova' }) })));
  });

  it('rejects invalid desktop uploads before the request', async () => {
    render(<MemoryRouter><HomepagePage /></MemoryRouter>);
    await screen.findByText('Campanha');
    fireEvent.change(screen.getByLabelText('Imagem para computador'), { target: { files: [new File(['bad'], 'bad.gif', { type: 'image/gif' })] } });
    expect(screen.getByRole('alert')).toHaveTextContent(/JPEG, PNG ou WebP/);
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/homepage/banners/'), expect.objectContaining({ method: 'POST' }));
  });

  it('posts a new banner with its desktop image and internal link', async () => {
    render(<MemoryRouter><HomepagePage /></MemoryRouter>);
    await screen.findByText('Campanha');
    fireEvent.change(screen.getByLabelText('Texto alternativo'), { target: { value: 'Novo banner' } });
    fireEvent.change(screen.getByLabelText('Link interno (opcional)'), { target: { value: '/drop/outro' } });
    fireEvent.change(screen.getByLabelText('Imagem para computador'), { target: { files: [new File(['png'], 'new.png', { type: 'image/png' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar banner' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/homepage/banners/'), expect.objectContaining({ method: 'POST' })));
    const options = fetch.mock.calls.find(([url, init]) => url.endsWith('/homepage/banners/') && init.method === 'POST')[1];
    expect(options.body.get('alt_text')).toBe('Novo banner');
    expect(options.body.get('link')).toBe('/drop/outro');
  });

  it('edits a banner and clears its optional link', async () => {
    render(<MemoryRouter><HomepagePage /></MemoryRouter>);
    await screen.findByText('Campanha');
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByLabelText('Link interno (opcional)'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar banner' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/homepage/banners/b1/'), expect.objectContaining({ method: 'PATCH' })));
  });

  it('makes the edit mode explicit: focus, banner name and highlight in the list', async () => {
    render(<MemoryRouter><HomepagePage /></MemoryRouter>);
    await screen.findByText('Campanha');
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    const heading = screen.getByRole('heading', { name: 'Editar banner' });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(heading).toHaveAccessibleDescription(/Editando: Campanha/);
    expect(screen.getByText('Em edição').closest('li')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('Imagem atual')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trocar imagem para computador' })).toBeInTheDocument();
  });

  it('switches the edited banner and returns focus to its Editar button on cancel', async () => {
    const second = { ...banner, id: 'b2', alt_text: 'Segundo', display_order: 1 };
    fetch.mockImplementation((url) => url.includes('/admin/')
      ? reply({ tagline: 'Frase atual', banners: [banner, second] }) : reply({}));
    render(<MemoryRouter><HomepagePage /></MemoryRouter>);
    await screen.findByText('Segundo');
    const [editFirst, editSecond] = screen.getAllByRole('button', { name: 'Editar' });
    fireEvent.click(editFirst);
    fireEvent.click(editSecond);
    expect(screen.getByText('Editando: Segundo')).toBeInTheDocument();
    expect(screen.getByText('Em edição').closest('li')).toHaveTextContent('Segundo');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar edição' }));
    await waitFor(() => expect(editSecond).toHaveFocus());
    expect(screen.getByRole('heading', { name: 'Adicionar banner' })).toBeInTheDocument();
    expect(screen.queryByText('Em edição')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Texto alternativo')).toHaveValue('');
  });

  it('leaves edit mode after saving', async () => {
    render(<MemoryRouter><HomepagePage /></MemoryRouter>);
    await screen.findByText('Campanha');
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar banner' }));
    await screen.findByText('Banner publicado.');
    expect(screen.getByRole('heading', { name: 'Adicionar banner' })).toBeInTheDocument();
    expect(screen.queryByText('Em edição')).not.toBeInTheDocument();
  });

  it('leaves edit mode when the banner being edited is removed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const second = { ...banner, id: 'b2', alt_text: 'Segundo', display_order: 1 };
    let list = [banner, second];
    fetch.mockImplementation((url, init) => {
      if (url.endsWith('/homepage/banners/b2/') && init?.method === 'DELETE') { list = [banner]; return reply(null, 204); }
      return url.includes('/admin/') ? reply({ tagline: 'Frase atual', banners: list }) : reply({});
    });
    render(<MemoryRouter><HomepagePage /></MemoryRouter>);
    await screen.findByText('Segundo');
    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[1]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Remover' })[1]);
    await screen.findByText('Banner removido.');
    expect(screen.getByRole('heading', { name: 'Adicionar banner' })).toBeInTheDocument();
    expect(screen.queryByText(/Editando:/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Texto alternativo')).toHaveValue('');
    vi.restoreAllMocks();
  });

  it('keeps editing another banner when a different one is removed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const second = { ...banner, id: 'b2', alt_text: 'Segundo', display_order: 1 };
    let list = [banner, second];
    fetch.mockImplementation((url, init) => {
      if (url.endsWith('/homepage/banners/b1/') && init?.method === 'DELETE') { list = [second]; return reply(null, 204); }
      return url.includes('/admin/') ? reply({ tagline: 'Frase atual', banners: list }) : reply({});
    });
    render(<MemoryRouter><HomepagePage /></MemoryRouter>);
    await screen.findByText('Segundo');
    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[1]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Remover' })[0]);
    await screen.findByText('Banner removido.');
    expect(screen.getByRole('heading', { name: 'Editar banner' })).toBeInTheDocument();
    expect(screen.getByText('Editando: Segundo')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('removes a banner after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<MemoryRouter><HomepagePage /></MemoryRouter>);
    await screen.findByText('Campanha');
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/homepage/banners/b1/'), expect.objectContaining({ method: 'DELETE' })));
    vi.restoreAllMocks();
  });

  it('sends the complete banner order when moving an item', async () => {
    const second = { ...banner, id: 'b2', alt_text: 'Segundo', display_order: 1 };
    fetch.mockImplementation((url) => url.includes('/admin/')
      ? reply({ tagline: 'Frase atual', banners: [banner, second] }) : reply({}));
    render(<MemoryRouter><HomepagePage /></MemoryRouter>);
    await screen.findByText('Segundo');
    fireEvent.click(screen.getByRole('button', { name: 'Descer Campanha' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/homepage/banners/order/'), expect.objectContaining({ method: 'PUT', body: JSON.stringify({ ids: ['b2', 'b1'] }) })));
  });

  it('can remove the optional mobile image while editing', async () => {
    fetch.mockImplementation((url) => url.includes('/admin/')
      ? reply({ tagline: 'Frase atual', banners: [{ ...banner, image_mobile: '/mobile.png' }] }) : reply({}));
    render(<MemoryRouter><HomepagePage /></MemoryRouter>);
    await screen.findByText('Campanha');
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Remover imagem de celular atual' }));
    expect(screen.queryByText('Imagem atual', { selector: 'figcaption' })).toBeInTheDocument();
    expect(screen.getAllByText('Imagem atual')).toHaveLength(1);
    expect(screen.getAllByText('Nenhuma nova imagem — a atual será mantida')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar banner' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/homepage/banners/b1/'), expect.objectContaining({ method: 'PATCH' })));
    const options = fetch.mock.calls.find(([url, init]) => url.endsWith('/homepage/banners/b1/') && init.method === 'PATCH')[1];
    expect(options.body.get('remove_image_mobile')).toBe('true');
  });

  it('keeps an unsaved phrase while a banner action refreshes the list', async () => {
    const second = { ...banner, id: 'b2', alt_text: 'Segundo', display_order: 1 };
    fetch.mockImplementation((url) => url.includes('/admin/')
      ? reply({ tagline: 'Frase atual', banners: [banner, second] }) : reply({}));
    render(<MemoryRouter><HomepagePage /></MemoryRouter>);
    await screen.findByText('Segundo');
    fireEvent.change(screen.getByLabelText('Frase da faixa'), { target: { value: 'Rascunho da frase' } });
    fireEvent.click(screen.getByRole('button', { name: 'Descer Campanha' }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/homepage/banners/order/'), expect.objectContaining({ method: 'PUT' })));
    expect(screen.getByLabelText('Frase da faixa')).toHaveValue('Rascunho da frase');
  });

  it('clears the file chooser after adding a banner', async () => {
    render(<MemoryRouter><HomepagePage /></MemoryRouter>);
    await screen.findByText('Campanha');
    fireEvent.change(screen.getByLabelText('Texto alternativo'), { target: { value: 'Novo' } });
    fireEvent.change(screen.getByLabelText('Imagem para computador'), { target: { files: [new File(['png'], 'new.png', { type: 'image/png' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar banner' }));
    await screen.findByText('Banner publicado.');
    expect(screen.getByLabelText('Imagem para computador').files).toHaveLength(0);
  });

  it('shows a clear image picker button and the selected filename', async () => {
    render(<MemoryRouter><HomepagePage /></MemoryRouter>);
    await screen.findByText('Campanha');
    const input = screen.getByLabelText('Imagem para computador');
    const openPicker = vi.spyOn(input, 'click');
    fireEvent.click(screen.getByRole('button', { name: 'Escolher imagem para computador' }));
    expect(openPicker).toHaveBeenCalledOnce();
    fireEvent.change(input, { target: { files: [new File(['png'], 'campanha.png', { type: 'image/png' })] } });
    expect(screen.getByText('campanha.png')).toBeInTheDocument();
  });
});
