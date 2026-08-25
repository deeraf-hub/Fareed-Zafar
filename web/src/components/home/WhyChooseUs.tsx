import { Bike, BadgeCheck, Phone, Tag } from 'lucide-react';

const benefits = [
  {
    icon: BadgeCheck,
    title: 'Quality Parts',
    description: 'Reliable products for everyday motorcycle use.',
  },
  {
    icon: Tag,
    title: 'Fair Prices',
    description: 'Products available across different budgets.',
  },
  {
    icon: Bike,
    title: 'Multiple Bike Models',
    description: 'Parts for popular motorcycle models in Pakistan.',
  },
  {
    icon: Phone,
    title: 'Easy Ordering',
    description: 'Order online, or call the shop and we will take it over the phone.',
  },
];

export const WhyChooseUs = () => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {benefits.map(({ icon: Icon, title, description }) => (
      <div key={title} className="card p-5">
        <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-base font-semibold text-ink-900">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{description}</p>
      </div>
    ))}
  </div>
);
