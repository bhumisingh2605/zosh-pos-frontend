import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { WorkspaceProvider } from './store/workspaceContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import AdminLayout from './layouts/AdminLayout';
import Coupons from './pages/coupons/Coupons';
import Toaster from './components/Toaster';

import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import Dashboard from './pages/dashboard/Dashboard';
import Stores from './pages/stores/Stores';
import Branches from './pages/branches/Branches';
import Categories from './pages/categories/Categories';
import Products from './pages/products/Products';
import Inventory from './pages/inventory/Inventory';
import Customers from './pages/customers/Customers';
import Employees from './pages/employees/Employees';
import Orders from './pages/orders/Orders';
import Refunds from './pages/refunds/Refunds';
import Shifts from './pages/shifts/Shifts';
import Reports from './pages/reports/Reports';
import POS from './pages/pos/POS';

function AuthedShell() {
  return (
    <ProtectedRoute>
      <WorkspaceProvider>
        <Outlet />
      </WorkspaceProvider>
    </ProtectedRoute>
  );
}

// The POS terminal gets its own boundary (not just the outer app-wide one) so a
// render error there shows a "reload terminal" screen instead of taking down
// every other route, and "try again" can re-mount just the terminal without a
// full page reload where possible.
function POSRoute() {
  return (
    <ErrorBoundary label="The POS terminal ran into a problem.">
      <POS />
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ErrorBoundary label="The app ran into a problem.">
      <Toaster />
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route element={<AuthedShell />}>
            <Route path="/pos" element={<POSRoute />} />

            <Route element={<AdminLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/stores" element={<Stores />} />
              <Route path="/branches" element={<Branches />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/products" element={<Products />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/refunds" element={<Refunds />} />
              <Route path="/shifts" element={<Shifts />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/coupons" element={<Coupons />} />
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
}