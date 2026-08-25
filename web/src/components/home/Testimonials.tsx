import { Quote } from 'lucide-react';
import { testimonials } from '../../data/testimonials';

export const Testimonials = () => (
  <div>
    <div className="grid gap-4 md:grid-cols-3">
      {testimonials.map((item) => (
        <figure key={item.id} className="card flex h-full flex-col p-5">
          <Quote className="size-6 text-brand-500" aria-hidden="true" />
          <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-700">“{item.quote}”</blockquote>
          <figcaption className="mt-4 border-t border-ink-100 pt-3 text-xs text-ink-500">
            <span className="font-semibold text-ink-800">{item.name}</span> · {item.role} · {item.city}
          </figcaption>
        </figure>
      ))}
    </div>
    <p className="mt-3 text-xs text-ink-400">
      Sample feedback shown while verified customer reviews are being collected.
    </p>
  </div>
);
