import { Reveal } from '@/components/ui/Reveal'
import { GemIcon, ShieldIcon, GiftIcon, TruckIcon, HeadsetIcon } from '@/components/ui/Icons'

const items = [
  {
    icon: GemIcon,
    title: 'Authentic Quality',
    description: 'Carefully selected jewellery with quality standards you can trust.',
  },
  {
    icon: ShieldIcon,
    title: 'Secure Shopping',
    description: 'A safe and reliable online shopping experience, every time.',
  },
  {
    icon: GiftIcon,
    title: 'Premium Packaging',
    description: 'Beautiful packaging suitable for gifting, no wrapping required.',
  },
  {
    icon: TruckIcon,
    title: 'Easy Delivery',
    description: 'Reliable delivery across Pakistan, right to your door.',
  },
  {
    icon: HeadsetIcon,
    title: 'Customer Support',
    description: 'Friendly support before and after your purchase.',
  },
]

export function TrustSection() {
  return (
    <section className="container-lux py-20 sm:py-24">
      <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((item, i) => (
          <Reveal key={item.title} delay={i * 80} className="flex flex-col items-center text-center gap-3">
            <item.icon className="text-champagne-600" />
            <h3 className="text-sm uppercase tracking-[0.1em] text-charcoal">{item.title}</h3>
            <p className="text-xs leading-relaxed text-charcoal-muted">{item.description}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
