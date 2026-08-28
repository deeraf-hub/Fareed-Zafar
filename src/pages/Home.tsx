import { Hero } from '@/components/home/Hero'
import { CategoryGrid } from '@/components/home/CategoryGrid'
import { NewArrivals } from '@/components/home/NewArrivals'
import { EditorialSplit } from '@/components/home/EditorialSplit'
import { BridalSection } from '@/components/home/BridalSection'
import { BestSellers } from '@/components/home/BestSellers'
import { TrustSection } from '@/components/home/TrustSection'
import { Testimonials } from '@/components/home/Testimonials'
import { InstagramGallery } from '@/components/home/InstagramGallery'
import { Newsletter } from '@/components/home/Newsletter'
import { siteConfig } from '@/config/site'
import { useSeo } from '@/lib/useSeo'

export function Home() {
  useSeo(`${siteConfig.brandName} — Timeless Jewellery, Made to Be Remembered`, siteConfig.supportingText)

  return (
    <div>
      <Hero />
      <CategoryGrid />
      <NewArrivals />
      <EditorialSplit />
      <BridalSection />
      <BestSellers />
      <TrustSection />
      <Testimonials />
      <InstagramGallery />
      <Newsletter />
    </div>
  )
}
