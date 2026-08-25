import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useState } from 'react';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { siteConfig } from '../config/site';
import { useSeo } from '../lib/seo';
import { whatsappLink } from '../lib/whatsapp';

const Contact = () => {
  const [form, setForm] = useState({ name: '', phone: '', bike: '', message: '' });

  useSeo({
    title: `Contact Us | ${siteConfig.name}`,
    description: `Contact ${siteConfig.name} by phone, WhatsApp or email for motorcycle spare parts, availability and fitment questions.`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: siteConfig.name,
      telephone: siteConfig.phone,
      email: siteConfig.email,
      address: {
        '@type': 'PostalAddress',
        streetAddress: `${siteConfig.address.line1}, ${siteConfig.address.line2}`,
        addressLocality: siteConfig.address.city,
        addressCountry: 'PK',
      },
    },
  });

  const composedMessage = `Hello ${siteConfig.name}, my name is ${form.name || '[name]'}. Bike: ${
    form.bike || '[bike model]'
  }. ${form.message || '[your question]'} You can reach me at ${form.phone || '[mobile number]'}.`;

  return (
    <div className="container-page">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Contact' }]} />

      <h1 className="section-title">Contact {siteConfig.shortName}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-500">
        Ask about a part, check availability or get help finding the right item for your bike. WhatsApp is the fastest
        way to reach us.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-base font-semibold text-ink-900">Shop information</h2>
            <ul className="mt-4 space-y-4 text-sm">
              <li className="flex gap-3">
                <Phone className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden="true" />
                <span>
                  <span className="block text-ink-500">Phone</span>
                  <a href={siteConfig.phoneHref} className="font-medium text-ink-900 hover:text-brand-600">
                    {siteConfig.phone}
                  </a>
                </span>
              </li>
              <li className="flex gap-3">
                <MessageCircle className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden="true" />
                <span>
                  <span className="block text-ink-500">WhatsApp</span>
                  <a
                    href={whatsappLink(`Hello ${siteConfig.name}, I have a question about a spare part.`)}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-medium text-ink-900 hover:text-brand-600"
                  >
                    Start a chat
                  </a>
                </span>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden="true" />
                <span>
                  <span className="block text-ink-500">Email</span>
                  <a href={`mailto:${siteConfig.email}`} className="font-medium text-ink-900 hover:text-brand-600">
                    {siteConfig.email}
                  </a>
                </span>
              </li>
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden="true" />
                <span>
                  <span className="block text-ink-500">Shop address</span>
                  <address className="font-medium not-italic text-ink-900">
                    {siteConfig.address.line1}
                    <br />
                    {siteConfig.address.line2}
                    <br />
                    {siteConfig.address.city}, {siteConfig.address.country}
                  </address>
                </span>
              </li>
              <li className="flex gap-3">
                <Clock className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden="true" />
                <span>
                  <span className="block text-ink-500">Business hours</span>
                  {siteConfig.businessHours.map((entry) => (
                    <span key={entry.days} className="block font-medium text-ink-900">
                      {entry.days}: {entry.hours}
                    </span>
                  ))}
                </span>
              </li>
            </ul>
            <p className="mt-5 rounded-lg bg-ink-50 p-3 text-xs text-ink-500">
              Contact details shown here are placeholders held in one configuration file
              (<code className="font-mono">src/config/site.ts</code>) — update them there and they change across the
              whole site.
            </p>
          </div>

          <div className="card overflow-hidden">
            <iframe
              title={`Map showing ${siteConfig.name}`}
              src={`https://maps.google.com/maps?q=${encodeURIComponent(siteConfig.mapsEmbedQuery)}&output=embed`}
              className="h-72 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        <div className="card h-fit p-5">
          <h2 className="text-base font-semibold text-ink-900">Send us a message</h2>
          <p className="mt-1 text-sm text-ink-500">
            Fill this in and it opens WhatsApp with your message ready to send — nothing is stored on this site.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-name" className="field-label">
                Your name
              </label>
              <input
                id="contact-name"
                type="text"
                className="field"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="e.g. Bilal Ahmed"
              />
            </div>
            <div>
              <label htmlFor="contact-phone" className="field-label">
                Mobile number
              </label>
              <input
                id="contact-phone"
                type="tel"
                inputMode="tel"
                className="field"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                placeholder="0300 1234567"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="contact-bike" className="field-label">
                Your bike model
              </label>
              <input
                id="contact-bike"
                type="text"
                className="field"
                value={form.bike}
                onChange={(event) => setForm({ ...form, bike: event.target.value })}
                placeholder="e.g. Honda CG 125"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="contact-message" className="field-label">
                What do you need?
              </label>
              <textarea
                id="contact-message"
                rows={4}
                className="field"
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
                placeholder="Part name, or describe the problem you are trying to fix"
              />
            </div>
          </div>

          <a
            href={whatsappLink(composedMessage)}
            target="_blank"
            rel="noreferrer noopener"
            className="btn-whatsapp mt-5 w-full"
          >
            <MessageCircle className="size-4" aria-hidden="true" /> Send on WhatsApp
          </a>
          <a href={siteConfig.phoneHref} className="btn-outline mt-3 w-full">
            <Phone className="size-4" aria-hidden="true" /> Call the shop
          </a>
        </div>
      </div>
    </div>
  );
};

export default Contact;
