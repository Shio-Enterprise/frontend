import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import CategoryPage from "./index";

vi.mock("../../../components/layout/public/PublicLayout", () => ({
  default: ({ children }) => <main>{children}</main>,
}));
vi.mock("../../../components/ui/ShioDesign", () => ({
  Icon: () => null,
  ProductCard: ({ product }) => <article>{product.name}</article>,
}));

const product = (id, name = `Produto ${id}`) => ({
  id,
  name,
  base_price: "100.00",
  images: [],
});
const response = (body, ok = true) => ({ ok, json: async () => body });
const filterOptions = {
  min_price: "0.00",
  max_price: "500.00",
  sizes: ["M", "G"],
  colors: ["Azul", "Preto"],
};
let listHandler;
let navigate;
let router;

function mount(url = "/category/all") {
  router = createMemoryRouter(
    [{ path: "/category/:name", element: <CategoryPage /> }],
    { initialEntries: [url] },
  );
  navigate = router.navigate;
  return render(<RouterProvider router={router} />);
}

const queries = () =>
  fetch.mock.calls
    .filter(([url]) => !url.includes("/filter-options/"))
    .map(([url]) => new URL(url, "http://localhost").searchParams);

beforeEach(() => {
  listHandler = () =>
    Promise.resolve(response({ count: 25, results: [product(1)] }));
  vi.stubGlobal(
    "fetch",
    vi.fn((url, options) =>
      url.includes("/filter-options/")
        ? Promise.resolve(response(filterOptions))
        : listHandler(url, options),
    ),
  );
});
afterEach(() => vi.unstubAllGlobals());

describe("CategoryPage server-side", () => {
  it("restaura filtros, ordenação e paginação de um link compartilhado", async () => {
    const view = mount("/category/camisetas?search=algodao&size=M&color=Azul&color=Preto&min_price=50&max_price=300&ordering=-base_price&page=2&page_size=10");
    await screen.findByText("25 produtos");
    const query = queries().at(-1);
    expect(query.get("category")).toBe("camisetas");
    expect(query.get("size")).toBe("M");
    expect(query.getAll("color")).toEqual(["Azul", "Preto"]);
    expect(query.get("min_price")).toBe("50");
    expect(query.get("max_price")).toBe("300");
    expect(query.get("ordering")).toBe("-base_price");
    expect(query.get("page")).toBe("2");
    expect(query.get("page_size")).toBe("10");
    expect(screen.getAllByRole("combobox")[0]).toHaveValue("price-desc");
    expect(screen.getAllByRole("slider")[0]).toHaveValue("50");
    const savedUrl = router.state.location.pathname + router.state.location.search;
    view.unmount();
    mount(savedUrl);
    await screen.findByText("25 produtos");
    expect(queries().at(-1).toString()).toBe(query.toString());
  });

  it("grava somente filtros aplicados e restaura resultados ao voltar e avançar", async () => {
    mount("/category/all?search=algodao&page=2&ordering=base_price");
    await screen.findByText("25 produtos");
    const original = router.state.location.search;
    fireEvent.click(screen.getByRole("button", { name: "M", exact: true }));
    fireEvent.click(screen.getByTitle("Azul"));
    expect(router.state.location.search).toBe(original);
    expect(queries()).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Aplicar Filtros" }));
    await waitFor(() => expect(queries().at(-1).get("size")).toBe("M"));
    const applied = new URLSearchParams(router.state.location.search);
    expect(applied.get("page")).toBe("1");
    expect(applied.get("search")).toBe("algodao");
    expect(applied.get("ordering")).toBe("base_price");
    expect(applied.getAll("color")).toEqual(["Azul"]);
    await act(async () => navigate(-1));
    expect(queries().at(-1).get("page")).toBe("2");
    expect(queries().at(-1).has("size")).toBe(false);
    await act(async () => navigate(1));
    expect(queries().at(-1).get("size")).toBe("M");
    expect(queries().at(-1).get("page")).toBe("1");
    fireEvent.click(screen.getByRole("button", { name: "Limpar todos" }));
    await waitFor(() => expect(queries().at(-1).has("size")).toBe(false));
    const cleared = new URLSearchParams(router.state.location.search);
    expect(cleared.has("color")).toBe(false);
    expect(cleared.get("search")).toBe("algodao");
    expect(cleared.get("ordering")).toBe("base_price");
    // As facetas não precisam ser recarregadas ao mudar parâmetros.
    expect(fetch.mock.calls.filter(([url]) => url.includes("/filter-options/"))).toHaveLength(1);
  });

  it("envia slug e search, mostra count e somente results sem ordenar localmente", async () => {
    listHandler = () =>
      Promise.resolve(
        response({ count: 25, results: [product(2, "Z"), product(1, "A")] }),
      );
    mount("/category/camisetas?search=algodao");
    await screen.findByText("25 produtos");
    expect(queries()[0].get("category")).toBe("camisetas");
    expect(queries()[0].get("search")).toBe("algodao");
    expect(queries()[0].get("page_size")).toBe("9");
    expect(
      screen.getAllByRole("article").map((card) => card.textContent),
    ).toEqual(["Z", "A", "Z", "A"]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("ignora q e não envia categoria all", async () => {
    mount("/category/all?q=camisa");
    await screen.findByText("25 produtos");
    expect(queries()[0].has("search")).toBe(false);
    expect(queries()[0].has("q")).toBe(false);
    expect(queries()[0].has("category")).toBe(false);
  });

  it("usa somente search, inclusive quando está vazio e há q na URL", async () => {
    mount("/category/all?search=atual&q=antiga");
    await screen.findByText("25 produtos");
    expect(queries().at(-1).get("search")).toBe("atual");
    await act(async () => navigate("/category/all?search=&q=antiga"));
    expect(queries().at(-1).has("search")).toBe(false);
  });

  it("substitui os resultados ao paginar e reinicia a página ao aplicar filtros", async () => {
    listHandler = (url) => {
      const page = new URL(url, "http://localhost").searchParams.get("page");
      return Promise.resolve(response({ count: 25, results: [product(page)] }));
    };
    mount();
    await screen.findAllByText("Produto 1");
    fireEvent.click(screen.getAllByRole("button", { name: "Próxima" })[0]);
    await screen.findAllByText("Produto 2");
    expect(screen.queryByText("Produto 1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "M", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Aplicar Filtros" }));
    await screen.findAllByText("Produto 1");
    expect(queries().at(-1).get("page")).toBe("1");
    expect(queries().at(-1).get("size")).toBe("M");
    expect(screen.queryByText("Produto 2")).not.toBeInTheDocument();
  });

  it("ignora resposta atrasada ao ordenar sem desmontar a categoria", async () => {
    let resolveOld;
    let oldSignal;
    mount();
    await screen.findByText("25 produtos");
    listHandler = (_url, { signal }) => {
      oldSignal = signal;
      return new Promise((resolve) => { resolveOld = resolve; });
    };
    fireEvent.click(screen.getAllByRole("button", { name: "Próxima" })[0]);
    await waitFor(() => expect(queries().at(-1).get("page")).toBe("2"));
    listHandler = () => Promise.resolve(response({ count: 1, results: [product(3, "Atual")] }));
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "price-asc" } });
    await screen.findAllByText("Atual");
    expect(oldSignal.aborted).toBe(true);
    await act(async () => resolveOld(response({ count: 99, results: [product(2, "Antigo")] })));
    expect(screen.queryByText("Antigo")).not.toBeInTheDocument();
    expect(screen.getByText("1 produto")).toBeInTheDocument();
    expect(queries().at(-1).get("page")).toBe("1");
  });

  it("consulta nova página e reinicia em 1 ao ordenar ou mudar a rota", async () => {
    mount();
    await screen.findByText("25 produtos");
    fireEvent.click(screen.getAllByRole("button", { name: "Próxima" })[0]);
    await waitFor(() => expect(queries().at(-1).get("page")).toBe("2"));
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "price-desc" },
    });
    await waitFor(() =>
      expect(queries().at(-1).get("ordering")).toBe("-base_price"),
    );
    expect(queries().at(-1).get("page")).toBe("1");
    await act(async () => navigate("/category/bones?search=novo"));
    expect(queries().at(-1).get("category")).toBe("bones");
    expect(queries().at(-1).get("search")).toBe("novo");
    expect(queries().at(-1).get("page")).toBe("1");
  });

  it("usa facetas globais e envia tamanho, cores repetidas e preços ao aplicar", async () => {
    mount();
    fireEvent.click(
      await screen.findByRole("button", { name: "M", exact: true }),
    );
    fireEvent.click(screen.getByTitle("Azul"));
    fireEvent.click(screen.getByTitle("Preto"));
    fireEvent.change(screen.getAllByRole("slider")[0], {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar Filtros" }));
    await waitFor(() => expect(queries().at(-1).get("size")).toBe("M"));
    expect(queries().at(-1).getAll("color")).toEqual(["Azul", "Preto"]);
    expect(queries().at(-1).get("min_price")).toBe("50");
    expect(queries().at(-1).get("max_price")).toBe("500");
    expect(queries().at(-1).get("page")).toBe("1");
  });

  it("ignora respostas antigas mesmo se o transporte não cancelar a promessa", async () => {
    let resolveOld;
    let oldSignal;
    listHandler = (_url, { signal }) => {
      oldSignal = signal;
      return new Promise((resolve) => {
        resolveOld = resolve;
      });
    };
    mount("/category/all?search=antiga");
    listHandler = () =>
      Promise.resolve(response({ count: 1, results: [product(2, "Atual")] }));
    await act(async () => navigate("/category/all?search=nova"));
    await screen.findAllByText("Atual");
    expect(oldSignal.aborted).toBe(true);
    await act(async () =>
      resolveOld(response({ count: 99, results: [product(1, "Antigo")] })),
    );
    expect(screen.queryByText("Antigo")).not.toBeInTheDocument();
    expect(screen.getByText("1 produto")).toBeInTheDocument();
  });

  it("sem rede mostra a mensagem da loja, não a do navegador (#64)", async () => {
    listHandler = () => Promise.reject(new TypeError("Failed to fetch"));
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os produtos. Tente novamente.",
    );
    expect(screen.queryByText(/Failed to fetch/)).not.toBeInTheDocument();
  });

  it("distingue erro da API de catálogo vazio", async () => {
    listHandler = () => Promise.resolve(response({}, false));
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os produtos",
    );
    expect(
      screen.queryByText("Nenhum produto encontrado"),
    ).not.toBeInTheDocument();
  });

  it("mostra estado vazio e permite aplicar filtros no modal mobile", async () => {
    listHandler = () => Promise.resolve(response({ count: 0, results: [] }));
    mount();
    await screen.findAllByText("Nenhum produto encontrado");
    fireEvent.click(
      screen.getByRole("button", { name: "Filtros", exact: true }),
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "G", exact: true }).at(-1),
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Aplicar Filtros" }).at(-1),
    );
    await waitFor(() => expect(queries().at(-1).get("size")).toBe("G"));
    expect(
      screen.getAllByRole("button", { name: "Aplicar Filtros" }),
    ).toHaveLength(1);
  });

  it("ordena por mais bem avaliados e volta para a página 1", async () => {
    mount("/category/all?page=2");
    await screen.findByText("25 produtos");
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "rating" },
    });
    await waitFor(() =>
      expect(queries().at(-1).get("ordering")).toBe("-rating_avg"),
    );
    expect(queries().at(-1).get("page")).toBe("1");
  });

  it("restaura a ordenação por avaliação de um link", async () => {
    mount("/category/all?ordering=-rating_avg");
    await screen.findByText("25 produtos");
    expect(queries().at(-1).get("ordering")).toBe("-rating_avg");
    expect(screen.getAllByRole("combobox")[0]).toHaveValue("rating");
    expect(
      screen.getAllByRole("option", { name: "Mais bem avaliados" }).length,
    ).toBeGreaterThan(0);
  });

  describe("acessibilidade (#64)", () => {
    it("filtros de cor e tamanho têm nome e estado selecionado", async () => {
      mount();
      await screen.findByText("25 produtos");
      const azul = screen.getAllByRole("button", { name: "Azul" })[0];
      expect(azul).toHaveAttribute("aria-pressed", "false");
      fireEvent.click(azul);
      expect(screen.getAllByRole("button", { name: "Azul" })[0]).toHaveAttribute("aria-pressed", "true");
      const tamanhoG = screen.getAllByRole("button", { name: "G", exact: true })[0];
      fireEvent.click(tamanhoG);
      expect(screen.getAllByRole("button", { name: "G", exact: true })[0]).toHaveAttribute("aria-pressed", "true");
    });

    it("seções de filtro anunciam se estão abertas", async () => {
      mount();
      await screen.findByText("25 produtos");
      const preco = screen.getByRole("button", { name: /^Preço/ });
      expect(preco).toHaveAttribute("aria-expanded", "true");
      fireEvent.click(preco);
      expect(preco).toHaveAttribute("aria-expanded", "false");
    });

    it("ordenação tem rótulo e a página tem título", async () => {
      mount();
      await screen.findByText("25 produtos");
      expect(screen.getAllByRole("combobox", { name: "Ordenar por:" })).toHaveLength(2);
      expect(screen.getByRole("heading", { level: 1, name: "Produtos" })).toBeInTheDocument();
    });

    it("paginação marca a página atual", async () => {
      mount("/category/all?page=2");
      await screen.findByText("25 produtos");
      const nav = screen.getAllByRole("navigation", { name: "Paginação" })[0];
      expect(within(nav).getByRole("button", { name: "Página 2" })).toHaveAttribute("aria-current", "page");
      expect(within(nav).getByRole("button", { name: "Página 1" })).not.toHaveAttribute("aria-current");
    });

    it("chips de filtro aplicado têm botão de remover com nome", async () => {
      mount("/category/all?size=G&color=Azul&min_price=10&max_price=50");
      await screen.findByText("25 produtos");
      fireEvent.click(screen.getByRole("button", { name: "Remover filtro de tamanho" }));
      await waitFor(() => expect(queries().at(-1).get("size")).toBeNull());
      expect(screen.getByRole("button", { name: "Remover filtro de cor" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Remover filtro de preço" })).toBeInTheDocument();
    });

    it("gaveta de filtros do celular é um diálogo que fecha com Esc e devolve o foco", async () => {
      mount();
      await screen.findByText("25 produtos");
      const abrir = screen.getByRole("button", { name: "Filtros", exact: true });
      abrir.focus();
      fireEvent.click(abrir);
      const dialog = screen.getByRole("dialog", { name: "Filtros" });
      expect(dialog).toHaveAttribute("aria-modal", "true");
      expect(within(dialog).getByRole("button", { name: "Fechar filtros" })).toBeInTheDocument();
      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(abrir).toHaveFocus();
    });
  });
});
