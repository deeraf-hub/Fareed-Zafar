import { useMemo } from 'react';
import { siteConfig } from '../config/site';
import { BikeFinder } from '../components/home/BikeFinder';
import { CategoryGrid } from '../components/home/CategoryGrid';
import { Hero } from '../components/home/Hero';
import { PopularBikes } from '../components/home/PopularBikes';
import { SectionHeading } from '../components/home/SectionHeading';
import { Testimonials } from '../components/home/Testimonials';
import { HelpCta } from '../components/home/HelpCta';
import { WhyChooseUs } from '../components/home/WhyChooseUs';
import { ProductGrid } from '../components/product/ProductGrid';
import { ProductGridSkeleton } from '../components/ui/Skeletons';
import { useSeo } from '../lib/seo';
import { useCatalog } from '../store/CatalogContext';

const Home = () => {
  const { products, categories, loading } = useCatalog();

  useSeo({
    title: `${siteConfig.name} | Motorcycle Spare Parts in Pakistan`,
    description: siteConfig.description,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Store',
      name: siteConfig.name,
      description: siteConfig.description,
      telephone: siteConfig.phone,
      email: siteConfig.email,
      address: {
        '@type': 'PostalAddress',
        streetAddress: `${siteConfig.address.line1}, ${siteConfig.address.line2}`,
        addressLocality: siteConfig.address.city,
        addressCountry: 'PK',
      },
      openingHours: 'Mo-Sa 09:00-20:00',
      currenciesAccepted: 'PKR',
      paymentAccepted: 'Cash on Delivery',
    },
  });

  const featured = useMemo(() => products.filter((product) => product.featured).slice(0, 8), [products]);
  const bestSellers = useMemo(
    () => products.filter((product) => product.popular && !product.featured).slice(0, 8),
    [products],
  );

  return (
    <>
      <Hero />

      <div className="container-page py-12">
        <SectionHeading
          title="Find Parts for Your Bike"
          description="Pick your motorcycle and we will show only the parts that fit it."
        />
        <BikeFinder />
      </div>

      <div className="container-page py-4">
        <SectionHeading
          title="Shop by Category"
          description="Engine, electrical, brakes, suspension, drive and accessories — organised the way a workshop looks for them."
          linkTo="/categories"
          linkLabel="All categories"
        />
        <CategoryGrid categories={categories} products={products} />
      </div>

      <div className="container-page py-12">
        <SectionHeading title="Featured Products" description="Fast-moving parts we keep in stock." linkTo="/shop" />
        {loading ? <ProductGridSkeleton count={8} /> : <ProductGrid products={featured} />}
      </div>

      <div className="container-page py-4">
        <SectionHeading title="Why Choose Qalandari Autos" />
        <WhyChooseUs />
      </div>

      <div className="container-page py-12">
        <SectionHeading
          title="Shop Parts by Motorcycle"
          description="Every product lists the bikes it fits, so you can check before ordering."
        />
        <PopularBikes products={products} />
      </div>

      {bestSellers.length > 0 && (
        <div className="container-page py-4">
          <SectionHeading title="Best Sellers" description="What riders and workshops order most often." linkTo="/shop?sort=popular" />
          {loading ? <ProductGridSkeleton count={8} /> : <ProductGrid products={bestSellers} />}
        </div>
      )}

      <div className="container-page py-12">
        <SectionHeading title="Customer Feedback" />
        <Testimonials />
      </div>

      <div className="container-page pb-12">
        <HelpCta />
      </div>
    </>
  );
};

export default Home;
