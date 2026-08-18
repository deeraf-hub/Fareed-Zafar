import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppShell } from './components/layout/app-shell';
import { useAuth } from './hooks/use-auth';
import { EmptyState } from './components/ui/states';
import { Button } from './components/ui/button';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const LoginPage = lazy(() => import('./pages/login'));
const DashboardPage = lazy(() => import('./pages/dashboard'));
const ProductsPage = lazy(() => import('./pages/products'));
const ProductFormPage = lazy(() => import('./pages/product-form'));
const ProductDetailPage = lazy(() => import('./pages/product-detail'));
const CategoriesPage = lazy(() => import('./pages/categories'));
const SuppliersPage = lazy(() => import('./pages/suppliers'));
const SupplierDetailPage = lazy(() => import('./pages/supplier-detail'));
const CustomersPage = lazy(() => import('./pages/customers'));
const InventoryPage = lazy(() => import('./pages/inventory'));
const MovementsPage = lazy(() => import('./pages/movements'));
const PurchasesPage = lazy(() => import('./pages/purchases'));
const PurchaseFormPage = lazy(() => import('./pages/purchase-form'));
const PurchaseDetailPage = lazy(() => import('./pages/purchase-detail'));
const SalesPage = lazy(() => import('./pages/sales'));
const SaleFormPage = lazy(() => import('./pages/sale-form'));
const SaleDetailPage = lazy(() => import('./pages/sale-detail'));
const ReturnsPage = lazy(() => import('./pages/returns'));
const AdjustmentsPage = lazy(() => import('./pages/adjustments'));
const StockCountPage = lazy(() => import('./pages/stock-count'));
const StockCountDetailPage = lazy(() => import('./pages/stock-count-detail'));
const TransfersPage = lazy(() => import('./pages/transfers'));
const LocationsPage = lazy(() => import('./pages/locations'));
const ReportsPage = lazy(() => import('./pages/reports'));
const ReportDetailPage = lazy(() => import('./pages/report-detail'));
const UsersPage = lazy(() => import('./pages/users'));
const AuditLogsPage = lazy(() => import('./pages/audit-logs'));
const NotificationsPage = lazy(() => import('./pages/notifications'));
const SettingsPage = lazy(() => import('./pages/settings'));
const ScanPage = lazy(() => import('./pages/scan'));
const AccountPage = lazy(() => import('./pages/account'));

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

/**
 * Client-side permission gate. It is a courtesy, not a security boundary —
 * every endpoint behind these screens re-checks the same permission.
 */
function RequirePermission({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { can } = useAuth();
  if (!can(permission)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="You do not have access to this page"
        description="Your role does not include this area. Ask an administrator if you need it."
        action={
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        }
      />
    );
  }
  return <>{children}</>;
}

const guard = (permission: string, element: React.ReactNode) => (
  <RequirePermission permission={permission}>{element}</RequirePermission>
);

export default function App() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={guard('dashboard:view', <DashboardPage />)} />
          <Route path="/scan" element={guard('inventory:view', <ScanPage />)} />
          <Route path="/account" element={<AccountPage />} />

          <Route path="/products" element={guard('product:view', <ProductsPage />)} />
          <Route path="/products/new" element={guard('product:create', <ProductFormPage />)} />
          <Route path="/products/:id/edit" element={guard('product:update', <ProductFormPage />)} />
          <Route path="/products/:id" element={guard('product:view', <ProductDetailPage />)} />
          <Route path="/categories" element={guard('product:view', <CategoriesPage />)} />

          <Route path="/inventory" element={guard('inventory:view', <InventoryPage />)} />
          <Route path="/inventory/movements" element={guard('inventory:view', <MovementsPage />)} />
          <Route path="/stock-adjustments" element={guard('inventory:view', <AdjustmentsPage />)} />
          <Route path="/stock-transfers" element={guard('inventory:view', <TransfersPage />)} />
          <Route path="/stock-count" element={guard('inventory:view', <StockCountPage />)} />
          <Route path="/stock-count/:id" element={guard('inventory:view', <StockCountDetailPage />)} />
          <Route path="/locations" element={guard('location:view', <LocationsPage />)} />

          <Route path="/purchases" element={guard('purchase:view', <PurchasesPage />)} />
          <Route path="/purchases/new" element={guard('purchase:create', <PurchaseFormPage />)} />
          <Route path="/purchases/:id/edit" element={guard('purchase:create', <PurchaseFormPage />)} />
          <Route path="/purchases/:id" element={guard('purchase:view', <PurchaseDetailPage />)} />
          <Route path="/suppliers" element={guard('supplier:view', <SuppliersPage />)} />
          <Route path="/suppliers/:id" element={guard('supplier:view', <SupplierDetailPage />)} />

          <Route path="/sales" element={guard('sale:view', <SalesPage />)} />
          <Route path="/sales/new" element={guard('sale:create', <SaleFormPage />)} />
          <Route path="/sales/:id" element={guard('sale:view', <SaleDetailPage />)} />
          <Route path="/customers" element={guard('customer:view', <CustomersPage />)} />
          <Route path="/returns" element={guard('return:view', <ReturnsPage />)} />

          <Route path="/reports" element={guard('report:view', <ReportsPage />)} />
          <Route path="/reports/:report" element={guard('report:view', <ReportDetailPage />)} />
          <Route path="/notifications" element={guard('notification:view', <NotificationsPage />)} />

          <Route path="/users" element={guard('user:manage', <UsersPage />)} />
          <Route path="/audit-logs" element={guard('audit:view', <AuditLogsPage />)} />
          <Route path="/settings" element={guard('settings:view', <SettingsPage />)} />

          <Route
            path="*"
            element={
              <EmptyState
                title="Page not found"
                description="The page you are looking for does not exist."
                action={
                  <Button asChild variant="outline">
                    <Link to="/dashboard">Back to dashboard</Link>
                  </Button>
                }
              />
            }
          />
        </Route>
      </Routes>
    </Suspense>
  );
}
