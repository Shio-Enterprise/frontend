# Frontend — Shio

Aplicação frontend da plataforma Shio, construída com **React 19 + Vite** e estilizada com **Tailwind CSS v4**.

## Tecnologias

| Categoria | Biblioteca |
|---|---|
| Framework | React 19 + Vite |
| Estilização | Tailwind CSS v4 |
| Roteamento | React Router v7 |
| HTTP | Axios |
| Autenticação | Google OAuth (`@react-oauth/google` + `jwt-decode`) |
| Testes | Vitest + @testing-library/react |

## Estrutura de Pastas

```
src/
├── components/
│   ├── layout/
│   │   ├── admin/        # AdminLayout, AdminNavbar
│   │   ├── public/       # PublicLayout, Navbar
│   │   ├── shared/       # Footer
│   │   └── user/         # AccountLayout
│   └── ui/               # Sistema de design (ShioDesign, MetricCard)
├── context/              # AuthContext, CartContext, useGoogleAuth
├── hooks/                # useApi (fetch genérico com estado)
├── lib/                  # authToken, axios (instância configurada)
├── pages/
│   ├── admin/            # Páginas do painel administrativo
│   ├── public/           # Páginas públicas da loja
│   └── user/             # Páginas autenticadas do usuário
├── router/               # Componente raiz do roteador
└── routes/               # Definição centralizada de rotas
```

Cada página em `src/pages/` é um diretório com `index.jsx` (componente) e `index.test.jsx` (teste).

## Rotas

### Públicas
| Rota | Página |
|---|---|
| `/` | HomePage |
| `/product/:id` | ProductDetailPage |
| `/category/:name` | CategoryPage |
| `/cart` | CartPage |
| `/payment` | PaymentPage |
| `/pix` | PixPage |

### Usuário
| Rota | Página | Autenticação |
|---|---|---|
| `/login` | LoginPage | — |
| `/signup` | SignUpPage | — |
| `/my-account` | MyAccountPage | obrigatória |
| `/my-orders` | MyOrdersPage | obrigatória |
| `/my-orders/:id` | OrderDetailsPage | obrigatória |
| `/addresses` | AddressesPage | obrigatória |
| `/new-address` | NewAddressPage | obrigatória |

### Admin

O painel administrativo utiliza a mesma rota de autenticação `/login`. O acesso às rotas abaixo exige uma conta com permissão administrativa.

| Rota | Página |
|---|---|
| `/admin/dashboard` | DashboardPage |
| `/admin/products` | ProductsPage |
| `/admin/new-product` | NewProductPage |
| `/admin/orders` | OrdersPage |
| `/admin/drops` | DropsPage |
| `/admin/drops/:id` | DropDetailsPage |
| `/admin/new-drop` | NewDropPage |
| `/admin/edit-drop/:id` | EditDropPage |
| `/admin/customers` | CustomersPage |

## Como Executar

1. **Instale as dependências:**
   ```sh
   npm install
   ```

2. **Execute o servidor de desenvolvimento:**
   ```sh
   npm run dev
   ```
   Disponível em `http://localhost:5173`.

3. **Build de produção:**
   ```sh
   npm run build
   ```

## Testes

O projeto utiliza **Vitest** com **@testing-library/react**. Cada página possui seu próprio arquivo de teste.

```sh
# Executar todos os testes
npm run test

# Executar com interface visual
npm run test:ui
```
