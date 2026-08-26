import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { CartDrawer } from './CartDrawer'
import { MobileTabBar } from './MobileTabBar'
import { SearchOverlay } from './SearchOverlay'
import { Toaster } from '@/components/ui/Toaster'

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const target = document.querySelector(hash)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname, hash])
  return null
}

export function Layout() {
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:bg-navy-700 focus:px-4 focus:py-2 focus:text-xs focus:text-ivory"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1 pb-16 sm:pb-0">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <MobileTabBar onSearch={() => setSearchOpen(true)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Toaster />
    </div>
  )
}
