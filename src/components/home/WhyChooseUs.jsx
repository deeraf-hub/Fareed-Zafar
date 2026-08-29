import { Boxes, Wallet, BadgeCheck, Headset, ShoppingBasket, Wrench } from 'lucide-react'

const FEATURES = [
  {
    icon: Boxes,
    title: 'Wide Product Range',
    description: 'Find hand tools, workshop tools, fasteners and hardware in one place.',
  },
  {
    icon: Wallet,
    title: 'Competitive Prices',
    description: 'Products available across a wide price range for different budgets.',
  },
  {
    icon: BadgeCheck,
    title: 'Quality Products',
    description: 'Tools selected for everyday use, workshops and professional applications.',
  },
  {
    icon: Headset,
    title: 'Reliable Service',
    description: 'Friendly and dependable customer support.',
  },
  {
    icon: ShoppingBasket,
    title: 'Convenient Shopping',
    description: 'Browse and find tools easily through the online shop.',
  },
  {
    icon: Wrench,
    title: 'Professional Solutions',
    description: 'Suitable products for technicians, contractors, workshops and DIY users.',
  },
]

export default function WhyChooseUs() {
  return (
    <section className="bg-white py-16 md:py-20">
      <div className="container-app">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-accent-600">Why Choose Us</span>
          <h2 className="mt-2 font-heading text-3xl font-bold text-navy-900 md:text-4xl">
            Built On Trust, Backed By Quality
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-lg border border-steel-100 bg-steel-50 p-6 transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-navy-800 text-accent-400">
                <Icon size={22} />
              </div>
              <h3 className="mb-2 font-heading text-lg font-bold text-navy-900">{title}</h3>
              <p className="text-sm text-steel-600">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
