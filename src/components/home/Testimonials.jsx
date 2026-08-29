import { Quote } from 'lucide-react'

const TESTIMONIALS = [
  {
    name: 'Imran Sheikh',
    role: 'Workshop Owner, Lahore',
    quote:
      'We source most of our workshop tools from Hand Tools Trading Corporation. The range is huge and prices are always fair.',
  },
  {
    name: 'Ayesha Malik',
    role: 'Interior Contractor',
    quote:
      'Reliable quality and quick service every time. Their socket sets and drill machines have held up well on-site.',
  },
  {
    name: 'Bilal Ahmed',
    role: 'Electrician',
    quote:
      'Good stock of insulated tools and fasteners. Staff know their products and help you find the right item fast.',
  },
]

export default function Testimonials() {
  return (
    <section className="bg-steel-100 py-16 md:py-20">
      <div className="container-app">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-accent-600">Trusted By Professionals</span>
          <h2 className="mt-2 font-heading text-3xl font-bold text-navy-900 md:text-4xl">
            What Our Customers Say
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-lg bg-white p-6 shadow-sm">
              <Quote size={26} className="mb-3 text-accent-500" />
              <p className="text-sm leading-relaxed text-steel-700">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-5 border-t border-steel-100 pt-4">
                <p className="text-sm font-semibold text-navy-900">{t.name}</p>
                <p className="text-xs text-steel-500">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
