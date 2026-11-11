import { Suspense } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { axe } from 'vitest-axe';
import routes from '../../../routes';

vi.mock('../../../components/layout/public/PublicLayout', () => ({
  default: ({ children }) => <main>{children}</main>,
}));

const pages = [
  ['Sobre nós', '/sobre-nos'],
  ['Nossa história', '/nossa-historia'],
  ['Contato', '/contato'],
  ['Suporte ao cliente', '/ajuda/suporte'],
  ['Prazo de entrega', '/ajuda/prazo-de-entrega'],
  ['Trocas e devoluções', '/ajuda/trocas-e-devolucoes'],
];

beforeEach(() => { vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); });
afterEach(() => { vi.restoreAllMocks(); });

function mount(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Suspense fallback={<p>Carregando página</p>}>
        <Routes>
          {routes.filter((route) => pages.some(([, path]) => path === route.path)).map((route) => (
            <Route key={route.path} path={route.path} element={route.component} />
          ))}
        </Routes>
      </Suspense>
    </MemoryRouter>,
  );
}

it.each(pages)('opens %s directly through its public route', async (title, path) => {
  const { container } = mount(path);
  expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  expect(screen.getByRole('note')).toHaveTextContent('Conteúdo provisório.');
  expect(document.title).toBe(`${title} | Shio`);
  expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  expect(await axe(container)).toHaveNoViolations();
});

it('navigates between sections and marks the current page', async () => {
  mount('/sobre-nos');
  await screen.findByRole('heading', { level: 1, name: 'Sobre nós' });
  const navigation = screen.getAllByRole('navigation', { name: 'Informações da Shio' })[0];
  fireEvent.click(within(navigation).getByRole('link', { name: 'Prazo de entrega' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Prazo de entrega' })).toBeInTheDocument();
  expect(within(navigation).getByRole('link', { name: 'Prazo de entrega' })).toHaveAttribute('aria-current', 'page');
  expect(document.title).toBe('Prazo de entrega | Shio');
});

it('does not invent contact destinations while the official channels are pending', async () => {
  mount('/contato');
  await screen.findByRole('heading', { level: 1, name: 'Contato' });
  expect(screen.getByText('Endereço oficial em breve')).toBeInTheDocument();
  expect(screen.getByText('Número oficial em breve')).toBeInTheDocument();
  expect(screen.getByText('Dias e horários a confirmar')).toBeInTheDocument();
  expect(document.querySelector('a[href^="mailto:"], a[href^="tel:"], a[href*="wa.me"]')).toBeNull();
});
