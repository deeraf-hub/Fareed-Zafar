import { useEffect } from 'react'
import Breadcrumbs from '../components/layout/Breadcrumbs.jsx'
import AboutSection from '../components/home/AboutSection.jsx'
import WhyChooseUs from '../components/home/WhyChooseUs.jsx'
import Testimonials from '../components/home/Testimonials.jsx'
import { WORKSHOP_WALL_IMAGE } from '../data/images.js'

const STATS = [
  { value: '60+', label: 'Products in Stock' },
  { value: '12', label: 'Tool Categories' },
  { value: '2023', label: 'Established' },
  { value: 'PKR 100+', label: 'Starting Price' },
]

export default function About() {
  useEffect(() => {
    document.title = 'About Us | Hand Tools Trading Corporation'
  }, [])

  return (
    <>
      <Breadcrumbs items={[{ label: 'About Us' }]} />

      <section className="relative flex h-56 items-center justify-center overflow-hidden bg-navy-950 md:h-72">
        <img
          src={WORKSHOP_WALL_IMAGE}
          alt="Hand tools hanging on a workshop wall"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-navy-950/60" />
        <h1 className="relative font-heading text-3xl font-bold text-white md:text-4xl">About Us</h1>
      </section>

      <div className="bg-white py-10">
        <div className="container-app grid grid-cols-2 gap-6 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-heading text-2xl font-bold text-navy-900 md:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs text-steel-500 md:text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <AboutSection />
      <WhyChooseUs />
      <Testimonials />
    </>
  )
}
