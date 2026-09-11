import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import CategoryPage from "./index";

vi.mock("../../../components/layout/public/PublicLayout", () => ({
  default: ({ children }) => <main>{children}</main>,
}));
vi.mock("../../../components/ui/ShioDesign", () => ({
  Icon: () => null,
  PageMarker: () => null,
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

function mount(url = "/category/all") {
  const router = createMemoryRouter(
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

  it("traduz q legado e não envia categoria all", async () => {
    mount("/category/all?q=camisa");
    await screen.findByText("25 produtos");
    expect(queries()[0].get("search")).toBe("camisa");
    expect(queries()[0].has("category")).toBe(false);
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
});
