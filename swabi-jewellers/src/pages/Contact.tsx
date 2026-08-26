import { useState, type FormEvent } from 'react'
import { siteConfig } from '@/config/site'
import { faqs } from '@/data/editorial'
import { Seo } from '@/components/Seo'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/Button'
import { MailIcon, PhoneIcon, PinIcon, InstagramIcon, FacebookIcon } from '@/components/ui/icons'

export default function Contact() {
  const [sent, setSent] = useState(false)
  const [values, setValues] = useState({ name: '', email: '', message: '' })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    // Wire this to a /api/contact endpoint or a form service when the backend is ready.
    setSent(true)
    setValues({ name: '', email: '', message: '' })
  }

  return (
    <>
      <Seo
        title="Contact Us"
        description={`Contact Swabi Jewellers — ${siteConfig.contact.phone}, ${siteConfig.contact.addressLines.join(', ')}.`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'JewelryStore',
          name: siteConfig.name,
          telephone: siteConfig.contact.phone,
          address: {
            '@type': 'PostalAddress',
            streetAddress: siteConfig.contact.addressLines.join(', '),
            addressLocality: siteConfig.contact.city,
            addressCountry: 'PK',
          },
        }}
      />
      <PageHeader
        eyebrow="We would love to hear from you"
        title="Contact Us"
        description="Questions about sizing, an order, or a bridal set? Call the shop, or send a message and we will reply the same working day."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Contact' }]}
      />

      <div className="container-luxe py-12 lg:py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <div>
            <h2 className="text-xl">Shop Details</h2>
            <ul className="mt-6 space-y-5 text-sm">
              <li className="flex gap-3">
                <PinIcon className="mt-0.5 shrink-0 text-champagne-600" />
                <address className="not-italic leading-relaxed text-stoneish">
                  {siteConfig.contact.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              </li>
              <li className="flex gap-3">
                <PhoneIcon className="shrink-0 text-champagne-600" />
                <a href={siteConfig.contact.phoneHref} className="link-underline text-navy-700">
                  {siteConfig.contact.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <MailIcon className="shrink-0 text-champagne-600" />
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="link-underline text-navy-700"
                >
                  {siteConfig.contact.email}
                </a>
              </li>
            </ul>

            <p className="mt-6 text-sm text-stoneish">{siteConfig.contact.hours}</p>

            <ul className="mt-8 flex gap-3">
              <li>
                <a
                  href={siteConfig.social.instagram.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Instagram"
                  className="grid h-10 w-10 place-items-center border border-linen text-navy-700 transition-colors hover:border-champagne-400 hover:text-champagne-700"
                >
                  <InstagramIcon />
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.social.facebook.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Facebook"
                  className="grid h-10 w-10 place-items-center border border-linen text-navy-700 transition-colors hover:border-champagne-400 hover:text-champagne-700"
                >
                  <FacebookIcon />
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl">Send a Message</h2>
            {sent ? (
              <div className="mt-6 border border-champagne-200 bg-champagne-50 p-8 text-sm text-navy-700">
                Thank you — your message has been noted. We will reply on the same working day.
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-6 grid gap-5">
                <div>
                  <label htmlFor="name" className="text-[11px] uppercase tracking-wideish text-stoneish">
                    Your Name
                  </label>
                  <input
                    id="name"
                    required
                    value={values.name}
                    onChange={(event) => setValues({ ...values, name: event.target.value })}
                    className="field mt-2"
                  />
                </div>
                <div>
                  <label
                    htmlFor="contact-email"
                    className="text-[11px] uppercase tracking-wideish text-stoneish"
                  >
                    Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={values.email}
                    onChange={(event) => setValues({ ...values, email: event.target.value })}
                    className="field mt-2"
                  />
                </div>
                <div>
                  <label
                    htmlFor="message"
                    className="text-[11px] uppercase tracking-wideish text-stoneish"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    required
                    value={values.message}
                    onChange={(event) => setValues({ ...values, message: event.target.value })}
                    className="field mt-2 resize-none"
                  />
                </div>
                <Button type="submit" size="lg" className="justify-self-start">
                  Send Message
                </Button>
              </form>
            )}

            <section className="mt-14">
              <h2 className="text-xl">Frequently Asked</h2>
              <dl className="mt-6 divide-y divide-linen border-y border-linen">
                {faqs.slice(0, 4).map((faq) => (
                  <div key={faq.question} className="py-5">
                    <dt className="text-sm text-navy-700">{faq.question}</dt>
                    <dd className="mt-2 text-sm leading-relaxed text-stoneish">{faq.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
