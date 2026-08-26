import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AdminLayout } from './components/admin/AdminLayout';
import { StoreLayout } from './components/layout/StoreLayout';
import { ScrollToTop } from './components/ui/ScrollToTop';
import { ProductGridSkeleton } from './components/ui/Skeletons';
import { AdminAuthProvider } from './store/AdminAuthContext';
import { CartProvider } from './store/CartContext';
import { CatalogProvider } from './store/CatalogContext';
import { OrdersProvider } from './store/OrdersContext';

// Route-level code splitting keeps the first load small on mobile connections.
const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Categories = lazy(() => import('./pages/Categories'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const BikePage = lazy(() => import('./pages/BikePage'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const TrackOrder = lazy(() => import('./pages/TrackOrder'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const PolicyPage = lazy(() => import('./pages/PolicyPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const AdminProductForm = lazy(() => import('./pages/admin/AdminProductForm'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminOrderDetail = lazy(() => import('./pages/admin/AdminOrderDetail'));
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));

const RouteFallback = () => (
  <div className="container-page py-12">
    <div className="skeleton mb-6 h-8 w-56" />
    <ProductGridSkeleton count={4} />
  </div>
);

const App = () => (
  <CatalogProvider>
    <CartProvider>
      <OrdersProvider>
        <AdminAuthProvider>
          <ScrollToTop />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route element={<StoreLayout />}>
                <Route index element={<Home />} />
                <Route path="shop" element={<Shop />} />
                <Route path="shop/:slug" element={<ProductDetail />} />
                <Route path="categories" element={<Categories />} />
                <Route path="category/:slug" element={<CategoryPage />} />
                <Route path="bike/:slug" element={<BikePage />} />
                <Route path="cart" element={<Cart />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="order-confirmation/:orderNumber" element={<OrderConfirmation />} />
                <Route path="track-order" element={<TrackOrder />} />
                <Route path="about" element={<About />} />
                <Route path="contact" element={<Contact />} />
                <Route path="privacy-policy" element={<PolicyPage />} />
                <Route path="terms-and-conditions" element={<PolicyPage />} />
                <Route path="shipping-policy" element={<PolicyPage />} />
                <Route path="return-policy" element={<PolicyPage />} />
                <Route path="*" element={<NotFound />} />
              </Route>

              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="products/new" element={<AdminProductForm />} />
                <Route path="products/:id" element={<AdminProductForm />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="orders/:id" element={<AdminOrderDetail />} />
                <Route path="customers" element={<AdminCustomers />} />
                <Route path="categories" element={<AdminCategories />} />
              </Route>
            </Routes>
          </Suspense>
        </AdminAuthProvider>
      </OrdersProvider>
    </CartProvider>
  </CatalogProvider>
);

export default App;
