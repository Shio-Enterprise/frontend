import { lazy } from "react";
import AdminLayout from "../components/layout/admin/AdminLayout";

// Public pages
const HomePage = lazy(() => import("../pages/public/HomePage"));
const ProductDetailPage = lazy(() => import("../pages/public/ProductDetailPage"));
const PixPage = lazy(() => import("../pages/public/PixPage"));
const PaymentPage = lazy(() => import("../pages/public/PaymentPage"));
const CategoryPage = lazy(() => import("../pages/public/CategoryPage"));
const CartPage = lazy(() => import("../pages/public/CartPage"));

// User pages
const LoginPage = lazy(() => import("../pages/user/LoginPage"));
const SignUpPage = lazy(() => import("../pages/user/SignUpPage"));
const MyAccountPage = lazy(() => import("../pages/user/MyAccountPage"));
const MyOrdersPage = lazy(() => import("../pages/user/MyOrdersPage"));
const OrderDetailsPage = lazy(() => import("../pages/user/OrderDetailsPage"));
const AddressesPage = lazy(() => import("../pages/user/AddressesPage"));
const NewAddressPage = lazy(() => import("../pages/user/NewAddressPage"));
// Admin pages
const DashboardPage = lazy(() => import("../pages/admin/DashboardPage"));
const ProductsPage = lazy(() => import("../pages/admin/ProductsPage"));
const NewProductPage = lazy(() => import("../pages/admin/NewProductPage"));
const OrdersPage = lazy(() => import("../pages/admin/OrdersPage"));
const NewDropPage = lazy(() => import("../pages/admin/NewDropPage"));
const EditDropPage = lazy(() => import("../pages/admin/EditDropPage"));
const DropsPage = lazy(() => import("../pages/admin/DropsPage"));
const DropDetailsPage = lazy(() => import("../pages/admin/DropDetailsPage"));
const CustomersPage = lazy(() => import("../pages/admin/CustomersPage"));

const routes = [
  // Public routes
  {
    path: "/",
    component: <HomePage />,
    isPrivate: false,
  },
  {
    path: "/product/:id",
    component: <ProductDetailPage />,
    isPrivate: false,
  },
  {
    path: "/pix",
    component: <PixPage />,
    isPrivate: false,
  },
  {
    path: "/payment",
    component: <PaymentPage />,
    isPrivate: false,
  },
  {
    path: "/category/:name",
    component: <CategoryPage />,
    isPrivate: false,
  },
  {
    path: "/cart",
    component: <CartPage />,
    isPrivate: false,
  },

  // User routes
  {
    path: "/login",
    component: <LoginPage />,
    isPrivate: false,
  },
  {
    path: "/signup",
    component: <SignUpPage />,
    isPrivate: false,
  },
  {
    path: "/my-account",
    component: <MyAccountPage />,
    isPrivate: true,
  },
  {
    path: "/my-orders",
    component: <MyOrdersPage />,
    isPrivate: true,
  },
  {
    path: "/my-orders/:id",
    component: <OrderDetailsPage />,
    isPrivate: true,
  },
  {
    path: "/addresses",
    component: <AddressesPage />,
    isPrivate: true,
  },
  {
    path: "/new-address",
    component: <NewAddressPage />,
    isPrivate: true,
  },
  // Admin routes
  {
    path: "/admin/dashboard",
    component: <AdminLayout><DashboardPage /></AdminLayout>,
    isAdmin: true,
  },
  {
    path: "/admin/products",
    component: <AdminLayout><ProductsPage /></AdminLayout>,
    isAdmin: true,
  },
  {
    path: "/admin/products/:id",
    component: <AdminLayout><ProductsPage /></AdminLayout>,
    isAdmin: true,
  },
  {
    path: "/admin/edit-product/:id",
    component: <AdminLayout><ProductsPage /></AdminLayout>,
    isAdmin: true,
  },
  {
    path: "/admin/stock/:id",
    component: <AdminLayout><ProductsPage /></AdminLayout>,
    isAdmin: true,
  },
  {
    path: "/admin/new-product",
    component: <AdminLayout><NewProductPage /></AdminLayout>,
    isAdmin: true,
  },
  {
    path: "/admin/orders",
    component: <AdminLayout><OrdersPage /></AdminLayout>,
    isAdmin: true,
  },
  {
    path: "/admin/orders/:id",
    component: <AdminLayout><OrdersPage /></AdminLayout>,
    isAdmin: true,
  },
  {
    path: "/admin/new-drop",
    component: <AdminLayout><NewDropPage /></AdminLayout>,
    isAdmin: true,
  },
  {
    path: "/admin/edit-drop/:id",
    component: <AdminLayout><EditDropPage /></AdminLayout>,
    isAdmin: true,
  },
  {
    path: "/admin/drops",
    component: <AdminLayout><DropsPage /></AdminLayout>,
    isAdmin: true,
  },
  {
    path: "/admin/drops/:id",
    component: <AdminLayout><DropDetailsPage /></AdminLayout>,
    isAdmin: true,
  },
  {
    path: "/admin/customers",
    component: <AdminLayout><CustomersPage /></AdminLayout>,
    isAdmin: true,
  },
  {
    path: "/admin/customers/:id",
    component: <AdminLayout><CustomersPage /></AdminLayout>,
    isAdmin: true,
  },
];

export default routes;
