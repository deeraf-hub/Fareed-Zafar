import { useEffect } from 'react'
import Hero from '../components/home/Hero.jsx'
import FeaturedCategories from '../components/home/FeaturedCategories.jsx'
import FeaturedProducts from '../components/home/FeaturedProducts.jsx'
import WhyChooseUs from '../components/home/WhyChooseUs.jsx'
import AboutSection from '../components/home/AboutSection.jsx'
import Testimonials from '../components/home/Testimonials.jsx'
import ContactSection from '../components/home/ContactSection.jsx'

export default function Home() {
  useEffect(() => {
    document.title = 'Hand Tools Trading Corporation | Hardware & Hand Tools in Lahore'
  }, [])

  return (
    <>
      <Hero />
      <FeaturedCategories />
      <FeaturedProducts />
      <WhyChooseUs />
      <AboutSection compact />
      <Testimonials />
      <ContactSection compact />
    </>
  )
}
