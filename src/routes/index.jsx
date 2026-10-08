/* eslint-disable react-refresh/only-export-components */
import { lazy } from "react";
import AdminLayout from "../components/layout/admin/AdminLayout";
import { ADMIN_PERMISSIONS } from "../lib/adminPermissions";

// Public pages
const HomePage = lazy(() => import("../pages/public/HomePage"));
const ProductDetailPage = lazy(() => import("../pages/public/ProductDetailPage"));
const PixPage = lazy(() => import("../pages/public/PixPage"));
const PaymentPage = lazy(() => import("../pages/public/PaymentPage"));
const CategoryPage = lazy(() => import("../pages/public/CategoryPage"));
const CartPage = lazy(() => import("../pages/public/CartPage"));

// User pages
const LoginPage = lazy(() => import("../pages/user/LoginPage"));
const ForgotPasswordPage = lazy(() => import("../pages/user/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("../pages/user/ResetPasswordPage"));
const SignUpPage = lazy(() => import("../pages/user/SignUpPage"));
const MyAccountPage = lazy(() => import("../pages/user/MyAccountPage"));
const MyOrdersPage = lazy(() => import("../pages/user/MyOrdersPage"));
const OrderDetailsPage = lazy(() => import("../pages/user/OrderDetailsPage"));
const AddressesPage = lazy(() => import("../pages/user/AddressesPage"));
const NewAddressPage = lazy(() => import("../pages/user/NewAddressPage"));

// Admin pages
const DashboardPage = lazy(() => import("../pages/admin/DashboardPage"));
const DetailedDashboardPage = lazy(() => import("../pages/admin/DetailedDashboardPage"));
const ProductsPage = lazy(() => import("../pages/admin/ProductsPage"));
const NewProductPage = lazy(() => import("../pages/admin/NewProductPage"));
const OrdersPage = lazy(() => import("../pages/admin/OrdersPage"));
const NewDropPage = lazy(() => import("../pages/admin/NewDropPage"));
const EditDropPage = lazy(() => import("../pages/admin/EditDropPage"));
const DropsPage = lazy(() => import("../pages/admin/DropsPage"));
const DropDetailsPage = lazy(() => import("../pages/admin/DropDetailsPage"));
const CustomersPage = lazy(() => import("../pages/admin/CustomersPage"));
const AdminPermissionsPage = lazy(() => import("../pages/admin/AdminPermissionsPage"));
const ReviewsPage = lazy(() => import("../pages/admin/ReviewsPage"));

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
    path: "/forgot-password",
    component: <ForgotPasswordPage />,
    isPrivate: false,
  },
  {
    path: "/reset-password/:uid/:token",
    component: <ResetPasswordPage />,
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
    requiredPermission: ADMIN_PERMISSIONS.DASHBOARD,
  },
  {
    path: "/admin/dashboard/detail",
    component: <AdminLayout><DetailedDashboardPage /></AdminLayout>,
    isAdmin: true,
    requiredPermission: ADMIN_PERMISSIONS.DASHBOARD,
  },
  {
    path: "/admin/products",
    component: <AdminLayout><ProductsPage /></AdminLayout>,
    isAdmin: true,
    requiredPermission: ADMIN_PERMISSIONS.CATALOG,
  },
  {
    path: "/admin/products/:id",
    component: <AdminLayout><ProductsPage /></AdminLayout>,
    isAdmin: true,
    requiredPermission: ADMIN_PERMISSIONS.CATALOG,
  },
  {
    path: "/admin/edit-product/:id",
    component: <AdminLayout><ProductsPage /></AdminLayout>,
    isAdmin: true,
    requiredPermission: ADMIN_PERMISSIONS.CATALOG,
  },
  {
    path: "/admin/stock/:id",
    component: <AdminLayout><ProductsPage /></AdminLayout>,
    isAdmin: true,
    requiredPermission: ADMIN_PERMISSIONS.CATALOG,
  },
  {
    path: "/admin/new-product",
    component: <AdminLayout><NewProductPage /></AdminLayout>,
    isAdmin: true,
    requiredPermission: ADMIN_PERMISSIONS.CATALOG,
  },
  {
    path: "/admin/orders",
    component: <AdminLayout><OrdersPage /></AdminLayout>,
    isAdmin: true,
    requiredPermission: ADMIN_PERMISSIONS.ORDERS,
  },
  {
    path: "/admin/orders/:id",
    component: <AdminLayout><OrdersPage /></AdminLayout>,
    isAdmin: true,
    requiredPermission: ADMIN_PERMISSIONS.ORDERS,
  },
  {
    path: "/admin/new-drop",
    component: <AdminLayout><NewDropPage /></AdminLayout>,
    isAdmin: true,
    requiredPermission: ADMIN_PERMISSIONS.DROPS,
  },
  {
    path: "/admin/edit-drop/:id",
    component: <AdminLayout><EditDropPage /></AdminLayout>,
    isAdmin: true,
    requiredPermission: ADMIN_PERMISSIONS.DROPS,
  },
  {
    path: "/admin/drops",
    component: <AdminLayout><DropsPage /></AdminLayout>,
    isAdmin: true,
    requiredPermission: ADMIN_PERMISSIONS.DROPS,
  },
  {
    path: "/admin/drops/:id",
    component: <AdminLayout><DropDetailsPage /></AdminLayout>,
    isAdmin: true,
    requiredPermission: ADMIN_PERMISSIONS.DROPS,
  },
  {
    path: "/admin/customers",
    component: <AdminLayout><CustomersPage /></AdminLayout>,
    isAdmin: true,
    requiredPermission: ADMIN_PERMISSIONS.CUSTOMERS,
  },
  {
    path: "/admin/customers/:id",
    component: <AdminLayout><CustomersPage /></AdminLayout>,
    isAdmin: true,
    requiredPermission: ADMIN_PERMISSIONS.CUSTOMERS,
  },
  {
    path: "/admin/reviews",
    component: <AdminLayout><ReviewsPage /></AdminLayout>,
    isAdmin: true,
    requiredPermission: ADMIN_PERMISSIONS.CATALOG,
  },
  {
    path: "/admin/permissions",
    component: <AdminLayout><AdminPermissionsPage /></AdminLayout>,
    isAdmin: true,
    requiredPermission: ADMIN_PERMISSIONS.ADMIN_PERMISSIONS,
  },
];

export default routes;