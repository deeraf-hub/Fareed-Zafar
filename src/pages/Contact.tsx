import { useState } from 'react'
import { siteConfig } from '@/config/site'
import { useSeo } from '@/lib/useSeo'
import { Reveal } from '@/components/ui/Reveal'

export function Contact() {
  useSeo('Contact Us', `Get in touch with ${siteConfig.brandName} — ${siteConfig.contact.phone}.`)
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="container-lux py-14 sm:py-20">
      <div className="mb-12 max-w-xl">
        <span className="eyebrow">Get in Touch</span>
        <h1 className="mt-3 text-3xl text-charcoal sm:text-4xl">Contact Us</h1>
        <p className="mt-4 text-charcoal-muted">
          Questions about an order, a bridal consultation, or a custom request? We would love to hear from you.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1fr_1.2fr]">
        <Reveal className="flex flex-col gap-8">
          <div>
            <h2 className="eyebrow mb-2">Phone</h2>
            <a href={siteConfig.contact.phoneHref} className="text-charcoal hover:text-champagne-700">
              {siteConfig.contact.phone}
            </a>
          </div>
          <div>
            <h2 className="eyebrow mb-2">Email</h2>
            <a href={`mailto:${siteConfig.contact.email}`} className="text-charcoal hover:text-champagne-700">
              {siteConfig.contact.email}
            </a>
          </div>
          <div>
            <h2 className="eyebrow mb-2">Store Address</h2>
            <p className="leading-relaxed text-charcoal-soft">{siteConfig.contact.address}</p>
          </div>
          <div>
            <h2 className="eyebrow mb-2">Hours</h2>
            <p className="text-charcoal-soft">Monday – Saturday, 11:00 AM – 8:00 PM</p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          {sent ? (
            <div className="border border-champagne-400 bg-champagne-50 p-8 text-center">
              <p className="text-charcoal">Thank you — your message has been sent. We&rsquo;ll be in touch shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <input required placeholder="Full Name" className="input-field" />
                <input required type="email" placeholder="Email" className="input-field" />
              </div>
              <input placeholder="Phone Number" className="input-field" />
              <input required placeholder="Subject" className="input-field" />
              <textarea required placeholder="Your Message" rows={5} className="input-field resize-none" />
              <button type="submit" className="btn-primary self-start">
                Send Message
              </button>
            </form>
          )}
        </Reveal>
      </div>
    </div>
  )
}
