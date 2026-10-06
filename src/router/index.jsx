import { Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import routes from "../routes";
import ProtectedRoute from "../components/ProtectedRoute";
import PageViewTracker from "../components/analytics/PageViewTracker";
import ConsentBanner from "../components/analytics/ConsentBanner";

const Router = () => {
  return (
    <BrowserRouter>
      <PageViewTracker />
      <ConsentBanner />
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          {routes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={
                (route.isPrivate || route.isAdmin)
                  ? <ProtectedRoute requireAdmin={route.isAdmin}>{route.component}</ProtectedRoute>
                  : route.component
              }
            />
          ))}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default Router;
