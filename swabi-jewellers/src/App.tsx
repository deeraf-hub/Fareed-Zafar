import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import Home from '@/pages/Home'

/** Route-level code splitting keeps the landing page payload small. */
const Shop = lazy(() => import('@/pages/Shop'))
const ProductDetail = lazy(() => import('@/pages/ProductDetail'))
const NewArrivals = lazy(() => import('@/pages/NewArrivals'))
const Collections = lazy(() => import('@/pages/Collections'))
const CollectionDetail = lazy(() => import('@/pages/CollectionDetail'))
const Bridal = lazy(() => import('@/pages/Bridal'))
const About = lazy(() => import('@/pages/About'))
const Contact = lazy(() => import('@/pages/Contact'))
const Cart = lazy(() => import('@/pages/Cart'))
const Checkout = lazy(() => import('@/pages/Checkout'))
const OrderConfirmation = lazy(() => import('@/pages/OrderConfirmation'))
const Wishlist = lazy(() => import('@/pages/Wishlist'))
const Account = lazy(() => import('@/pages/Account'))
const Faqs = lazy(() => import('@/pages/Faqs'))
const PolicyPage = lazy(() => import('@/pages/legal/PolicyPage'))
const NotFound = lazy(() => import('@/pages/NotFound'))

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
      <span className="h-10 w-10 animate-spin rounded-full border border-linen border-t-champagne-500" />
      <span className="sr-only">Loading</span>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route
          path="*"
          element={
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/shop" element={<Shop />} />
                <Route path="/shop/:category" element={<Shop />} />
                <Route path="/product/:slug" element={<ProductDetail />} />
                <Route path="/new-arrivals" element={<NewArrivals />} />
                <Route path="/collections" element={<Collections />} />
                <Route path="/collections/:slug" element={<CollectionDetail />} />
                <Route path="/bridal" element={<Bridal />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order/:orderId" element={<OrderConfirmation />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/account" element={<Account />} />
                <Route path="/faqs" element={<Faqs />} />
                <Route path="/delivery" element={<PolicyPage />} />
                <Route path="/returns" element={<PolicyPage />} />
                <Route path="/jewellery-care" element={<PolicyPage />} />
                <Route path="/privacy" element={<PolicyPage />} />
                <Route path="/terms" element={<PolicyPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          }
        />
      </Route>
    </Routes>
  )
}
