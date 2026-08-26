import { Seo } from '@/components/Seo'
import { Hero } from '@/components/home/Hero'
import { TrustSection } from '@/components/home/TrustSection'
import { CategoryShowcase } from '@/components/home/CategoryShowcase'
import { ProductSection } from '@/components/home/ProductSection'
import { EditorialSplit } from '@/components/home/EditorialSplit'
import { ModelStories } from '@/components/home/ModelStory'
import { BridalFeature } from '@/components/home/BridalFeature'
import { Testimonials } from '@/components/home/Testimonials'
import { SocialGallery } from '@/components/home/SocialGallery'
import { bestSellers, newArrivals } from '@/data/products'
import { siteConfig } from '@/config/site'

export default function Home() {
  const organisationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JewelryStore',
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    telephone: siteConfig.contact.phone,
    email: siteConfig.contact.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: siteConfig.contact.addressLines.join(', '),
      addressLocality: siteConfig.contact.city,
      addressCountry: 'PK',
    },
    openingHours: 'Mo-Sa 11:00-21:00',
    sameAs: [siteConfig.social.instagram.url, siteConfig.social.facebook.url],
  }

  return (
    <>
      <Seo
        title={`${siteConfig.name} | ${siteConfig.tagline}`}
        description={siteConfig.description}
        jsonLd={organisationJsonLd}
      />
      <Hero />
      <TrustSection />
      <CategoryShowcase />
      <ProductSection
        eyebrow="Just in"
        title="New Arrivals"
        description="The newest pieces to leave the workshop, added weekly."
        products={newArrivals.slice(0, 8)}
        link={{ label: 'View all new arrivals', to: '/new-arrivals' }}
        align="left"
      />
      <EditorialSplit />
      <ModelStories ids={['story-everyday']} />
      <BridalFeature />
      <ProductSection
        eyebrow="Best sellers"
        title="Our Most Loved Pieces"
        description="The pieces our customers come back for — and gift most often."
        products={bestSellers.slice(0, 8)}
        link={{ label: 'Shop best sellers', to: '/shop?sort=best-selling' }}
        align="left"
        showRating
      />
      <ModelStories ids={['story-detail', 'story-hands']} />
      <Testimonials />
      <SocialGallery />
    </>
  )
}
