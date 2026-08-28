import { Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Home } from '@/pages/Home'
import { Shop } from '@/pages/Shop'
import { ProductDetail } from '@/pages/ProductDetail'
import { Cart } from '@/pages/Cart'
import { Checkout } from '@/pages/Checkout'
import { Wishlist } from '@/pages/Wishlist'
import { About } from '@/pages/About'
import { Collections } from '@/pages/Collections'
import { Contact } from '@/pages/Contact'
import { PolicyPage } from '@/pages/PolicyPage'
import { Faqs } from '@/pages/Faqs'
import { NotFound } from '@/pages/NotFound'
import { Login } from '@/pages/account/Login'
import { Register } from '@/pages/account/Register'
import { AccountLayout } from '@/pages/account/AccountLayout'
import { Dashboard } from '@/pages/account/Dashboard'
import { Orders } from '@/pages/account/Orders'
import { Addresses } from '@/pages/account/Addresses'
import { Profile } from '@/pages/account/Profile'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />

        <Route path="shop" element={<Shop />} />
        <Route path="shop/:category" element={<Shop />} />
        <Route path="collections" element={<Collections />} />
        <Route path="collections/:category" element={<Shop />} />
        <Route path="product/:slug" element={<ProductDetail />} />

        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="wishlist" element={<Wishlist />} />

        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="faqs" element={<Faqs />} />
        <Route path="policies/:slug" element={<PolicyPage />} />

        <Route path="account/login" element={<Login />} />
        <Route path="account/register" element={<Register />} />
        <Route path="account" element={<AccountLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="addresses" element={<Addresses />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
